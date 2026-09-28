interface Grain {
  sample: number; start: number; offset: number; length: number;
  amplitude: number; pan: number;
}

// Pure sample mixing runs outside the page and the real-time audio thread.
// Keep the worker self-contained so this also works on the LAN HTTP player.
const workerCode = `
const samples = new Map();
let grains = [];
self.onmessage = ({ data: m }) => {
  if (m.type === 'sample') { samples.delete(m.id); samples.set(m.id, m.channels); return; }
  if (m.type === 'reset') { grains = []; return; }
  if (m.type !== 'render') return;
  grains.push(...m.grains);
  for (let from = m.from; from < m.to; from += m.chunk) {
    const to = Math.min(m.to, from + m.chunk);
    const left = new Float32Array(to - from), right = new Float32Array(to - from);
    for (const g of grains) {
      const source = samples.get(g.sample);
      if (!source) continue;
      const lo = Math.max(from, g.start), hi = Math.min(to, g.start + g.length);
      const attack = Math.max(m.rate * 0.002, g.length * 0.25);
      const angle = (g.pan + 1) * Math.PI / 4;
      const monoL = Math.cos(angle), monoR = Math.sin(angle);
      const stereoAngle = (g.pan <= 0 ? g.pan + 1 : g.pan) * Math.PI / 2;
      const c = Math.cos(stereoAngle), s = Math.sin(stereoAngle);
      for (let frame = lo; frame < hi; frame++) {
        const age = frame - g.start, index = g.offset + age, out = frame - from;
        const envelope = Math.min(1, age / attack, (g.length - age) / attack) * g.amplitude;
        const a = source[0][index] || 0;
        if (source.length === 1) {
          left[out] += a * envelope * monoL; right[out] += a * envelope * monoR;
        } else {
          const b = source[1][index] || 0;
          if (g.pan <= 0) { left[out] += (a + b * c) * envelope; right[out] += b * s * envelope; }
          else { left[out] += a * c * envelope; right[out] += (b + a * s) * envelope; }
        }
      }
    }
    grains = grains.filter(g => g.start + g.length > to);
    self.postMessage({ generation: m.generation, from, left, right }, [left.buffer, right.buffer]);
  }
  // Sample changes can retain old grains, but not every painting's recording.
  const used = new Set(grains.map(g => g.sample));
  const recent = [...samples.keys()].slice(-2);
  for (const id of samples.keys()) if (!used.has(id) && !recent.includes(id)) samples.delete(id);
};
`;

/** Two seconds of foreground / four seconds of background audio are mixed ahead.
 * Playback needs two native source nodes per second, independent of grain density.
 */
export class MobileGrainRenderer {
  private readonly worker: Worker;
  private readonly ids = new WeakMap<AudioBuffer, number>();
  private readonly registered = new Set<number>();
  private nextId = 0;
  private generation = 0;
  private cursor = 0;
  private pendingFrames = 0;
  private events: Grain[] = [];
  private ends: number[] = [];
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly chunk: number;
  private disposed = false;

  constructor(private context: AudioContext, private output: AudioNode, onFailure: () => void) {
    this.chunk = Math.round(context.sampleRate * 0.5);
    const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }));
    try { this.worker = new Worker(url); } finally { URL.revokeObjectURL(url); }
    this.worker.onerror = () => { if (!this.disposed) onFailure(); };
    this.worker.onmessage = ({ data }) => {
      if (this.disposed || data.generation !== this.generation) return;
      this.pendingFrames = Math.max(0, this.pendingFrames - data.left.length);
      const at = data.from / context.sampleRate;
      const late = Math.max(0, context.currentTime - at);
      if (late >= data.left.length / context.sampleRate) return;
      const buffer = context.createBuffer(2, data.left.length, context.sampleRate);
      buffer.copyToChannel(data.left, 0); buffer.copyToChannel(data.right, 1);
      const source = context.createBufferSource(); source.buffer = buffer;
      source.connect(this.output); this.sources.add(source);
      source.onended = () => { this.sources.delete(source); source.disconnect(); };
      source.start(Math.max(at, context.currentTime), late);
    };
  }

  get nextTime(): number { return Math.max(this.cursor / this.context.sampleRate, this.context.currentTime + 0.08); }

  horizon(seconds: number): number {
    const rate = this.context.sampleRate;
    // A slow worker must not accumulate an unbounded backlog of stale audio.
    if (this.pendingFrames >= rate * 6) return this.cursor / rate;
    this.cursor = Math.max(this.cursor, Math.ceil((this.context.currentTime + 0.08) * rate));
    const chunks = Math.max(0, Math.ceil(((this.context.currentTime + seconds) * rate - this.cursor) / this.chunk));
    return (this.cursor + chunks * this.chunk) / rate;
  }

  add(buffer: AudioBuffer, time: number, offset: number, duration: number, amplitude: number, pan: number): void {
    const rate = this.context.sampleRate;
    const start = Math.round(time * rate), length = Math.floor(duration * rate);
    this.ends = this.ends.filter(end => end > start);
    // Count overlapping grains at their playback time, not queued future grains.
    if (this.ends.length >= 64 || length < 1) return;
    let id = this.ids.get(buffer);
    if (id === undefined) { id = ++this.nextId; this.ids.set(buffer, id); }
    if (!this.registered.has(id)) {
      const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, channel) => buffer.getChannelData(channel).slice());
      this.worker.postMessage({ type: 'sample', id, channels }, channels.map(channel => channel.buffer));
      this.registered.add(id);
      // Worker retains the two most recently registered recordings plus live grains.
      while (this.registered.size > 2) this.registered.delete(this.registered.values().next().value!);
    }
    this.ends.push(start + length);
    this.events.push({ sample: id, start, offset: Math.floor(offset * rate), length, amplitude, pan });
  }

  flush(until: number): void {
    const to = Math.round(until * this.context.sampleRate);
    if (to <= this.cursor) return;
    this.pendingFrames += to - this.cursor;
    this.worker.postMessage({ type: 'render', generation: this.generation, from: this.cursor, to,
      chunk: this.chunk, rate: this.context.sampleRate, grains: this.events });
    this.events = []; this.cursor = to;
  }

  stop(): void {
    ++this.generation; this.cursor = 0; this.pendingFrames = 0; this.events = []; this.ends = [];
    this.worker.postMessage({ type: 'reset' });
    for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
    this.sources.clear();
  }
  dispose(): void { this.stop(); this.disposed = true; this.worker.terminate(); }
}
