import { defaults, type Parameters } from '../parameters';
import { CloudReverb } from './CloudReverb';

const LOOK_AHEAD_SECONDS = 0.12;
const SCHEDULER_INTERVAL_MS = 25;
const MAX_ACTIVE_GRAINS = 64;
const FIXED_PLAYBACK_RATE = 1;
const FIXED_ENVELOPE_SLOPE = 0.5;
const SAMPLE_BLEND_SECONDS = 2;

function between(a: number, b: number): number {
  return Math.min(a, b) + Math.random() * Math.abs(b - a);
}

export class GranularEngine {
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private readonly cloud: CloudReverb;
  private buffer: AudioBuffer | null = null;
  private previousBuffer: AudioBuffer | null = null;
  private previousSelectionStart = 0;
  private previousSelectionEnd = 0;
  private sampleBlendStart = 0;
  private sampleBlendSeconds = SAMPLE_BLEND_SECONDS;
  private timer: number | null = null;
  private decayTimer: number | null = null;
  private nextGrainTime = 0;
  private activeGrains = new Set<AudioBufferSourceNode>();
  private activeShimmers = new Set<AudioBufferSourceNode>();
  private playing = false;
  private sampleRequest = 0;
  private parameters: Parameters = { ...defaults };

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = this.parameters.gain;
    this.output.connect(destination);
    this.cloud = new CloudReverb(
      context,
      this.output,
      this.parameters.reverbMix,
      this.parameters.reverbDecay,
      this.parameters.reverbShimmer,
    );
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get sampleDurationMs(): number {
    return (this.buffer?.duration ?? 0) * 1000;
  }

  get currentParameters(): Parameters {
    return { ...this.parameters };
  }

  async loadSample(url: string, blendSeconds = SAMPLE_BLEND_SECONDS): Promise<number> {
    const request = ++this.sampleRequest;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sample request failed (${response.status})`);
    const bytes = await response.arrayBuffer();
    const decoded = await this.context.decodeAudioData(bytes);
    if (decoded.length === 0) throw new Error('The sample is empty');
    if (request !== this.sampleRequest) return this.sampleDurationMs;

    // Blend source choices for newly scheduled grains; existing grains keep ringing.
    this.previousBuffer = this.playing ? this.buffer : null;
    this.previousSelectionStart = this.parameters.selectionStart;
    this.previousSelectionEnd = this.parameters.selectionEnd;
    this.sampleBlendStart = this.context.currentTime;
    this.sampleBlendSeconds = Math.max(0.1, blendSeconds);
    this.buffer = decoded;
    this.parameters.selectionStart = 0;
    this.parameters.selectionEnd = decoded.duration * 1000;
    return this.sampleDurationMs;
  }

  async loadFile(file: File): Promise<number> {
    const url = URL.createObjectURL(file);
    try {
      return await this.loadSample(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  setParameter<K extends keyof Parameters>(key: K, value: Parameters[K]): void {
    this.parameters[key] = value;
    if (key === 'gain') {
      this.output.gain.setTargetAtTime(this.parameters.gain, this.context.currentTime, 0.02);
    } else if (key === 'reverbMix') {
      this.cloud.setMix(this.parameters.reverbMix);
    } else if (key === 'reverbShimmer') {
      this.cloud.setShimmer(this.parameters.reverbShimmer);
    } else if (key === 'reverbDecay') {
      if (this.decayTimer !== null) window.clearTimeout(this.decayTimer);
      this.decayTimer = window.setTimeout(() => {
        this.cloud.setDecay(this.parameters.reverbDecay);
        this.decayTimer = null;
      }, 180);
    }
  }

  transitionReverbDecay(seconds: number, fadeSeconds: number): void {
    if (this.decayTimer !== null) window.clearTimeout(this.decayTimer);
    this.decayTimer = null;
    this.cloud.setDecay(seconds, fadeSeconds);
  }

  async start(): Promise<void> {
    if (!this.buffer) throw new Error('Load a sample first');
    const context = this.context;
    await context.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextGrainTime = context.currentTime + 0.02;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), SCHEDULER_INTERVAL_MS);
  }

  stop(): void {
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    for (const source of [...this.activeGrains, ...this.activeShimmers]) {
      try { source.stop(); } catch { /* Already stopped. */ }
    }
    this.activeGrains.clear();
    this.activeShimmers.clear();
    this.previousBuffer = null;
  }

  dispose(): void {
    this.stop();
    if (this.decayTimer !== null) window.clearTimeout(this.decayTimer);
    this.cloud.dispose();
    this.output.disconnect();
  }

  private schedule(): void {
    const context = this.context;
    if (!this.playing) return;
    const horizon = context.currentTime + LOOK_AHEAD_SECONDS;
    // The cap keeps the UI responsive even if density is raised while the tab stalls.
    let scheduled = 0;
    while (this.nextGrainTime < horizon && scheduled < MAX_ACTIVE_GRAINS) {
      if (this.activeGrains.size < MAX_ACTIVE_GRAINS) {
        let sourceBuffer = this.buffer;
        let selectionStart = this.parameters.selectionStart;
        let selectionEnd = this.parameters.selectionEnd;
        if (this.previousBuffer) {
          const blend = Math.max(0, Math.min(1, (this.nextGrainTime - this.sampleBlendStart) / this.sampleBlendSeconds));
          if (blend >= 1) {
            this.previousBuffer = null;
          } else if (Math.random() >= blend) {
            sourceBuffer = this.previousBuffer;
            selectionStart = this.previousSelectionStart;
            selectionEnd = this.previousSelectionEnd;
          }
        }
        this.scheduleGrain(this.nextGrainTime, sourceBuffer, selectionStart, selectionEnd);
      }
      this.nextGrainTime += 1 / Math.max(0.1, this.parameters.density);
      scheduled++;
    }
    if (this.nextGrainTime < context.currentTime) {
      this.nextGrainTime = context.currentTime;
    }
  }

  private scheduleGrain(time: number, buffer: AudioBuffer | null, selectionStart: number, selectionEnd: number): void {
    const context = this.context;
    if (!buffer) return;
    const p = this.parameters;

    const requestedDuration = between(p.lengthMin, p.lengthMax) / 1000;
    const low = Math.max(0, Math.min(selectionStart, selectionEnd) / 1000);
    const high = Math.min(buffer.duration, Math.max(selectionStart, selectionEnd) / 1000);
    const offset = between(Math.min(low, buffer.duration), Math.max(low, high));
    const duration = Math.min(requestedDuration, buffer.duration - offset);
    if (duration <= 0.002) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = FIXED_PLAYBACK_RATE;

    const cutoff = Math.min(context.sampleRate * 0.49, between(p.filterFreqMin, p.filterFreqMax));
    const q = between(p.filterQMin, p.filterQMax);
    const filter1 = context.createBiquadFilter();
    const filter2 = context.createBiquadFilter();
    filter1.type = p.filterType;
    filter2.type = p.filterType;
    filter1.frequency.value = cutoff;
    filter2.frequency.value = cutoff;
    filter1.Q.value = q;
    filter2.Q.value = q;

    const envelope = context.createGain();
    const amplitude = between(p.ampMin, p.ampMax);
    const attack = Math.max(0.002, duration * FIXED_ENVELOPE_SLOPE * 0.5);
    const release = Math.max(0.002, duration * FIXED_ENVELOPE_SLOPE * 0.5);
    const grainStart = Math.max(time, context.currentTime);
    envelope.gain.setValueAtTime(0, grainStart);
    envelope.gain.linearRampToValueAtTime(amplitude, grainStart + attack);
    envelope.gain.setValueAtTime(amplitude, grainStart + duration - release);
    envelope.gain.linearRampToValueAtTime(0, grainStart + duration);

    source.connect(filter1).connect(filter2).connect(envelope).connect(this.cloud.input);
    source.onended = () => {
      this.activeGrains.delete(source);
      source.disconnect();
      filter1.disconnect();
      filter2.disconnect();
      envelope.disconnect();
    };
    this.activeGrains.add(source);
    source.start(grainStart, offset);
    source.stop(grainStart + duration);
    if (p.reverbMix > 0 && p.reverbShimmer > 0) {
      this.scheduleShimmerGrain(buffer, offset, duration, amplitude, grainStart);
    }
  }

  private scheduleShimmerGrain(buffer: AudioBuffer, offset: number, duration: number, amplitude: number, start: number): void {
    const shimmerDuration = Math.min(duration, (buffer.duration - offset) / 2);
    if (shimmerDuration <= 0.002) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 2;
    const envelope = this.context.createGain();
    const edge = shimmerDuration * FIXED_ENVELOPE_SLOPE * 0.5;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(amplitude, start + edge);
    envelope.gain.setValueAtTime(amplitude, start + shimmerDuration - edge);
    envelope.gain.linearRampToValueAtTime(0, start + shimmerDuration);
    source.connect(envelope).connect(this.cloud.shimmerInput);
    source.onended = () => {
      this.activeShimmers.delete(source);
      source.disconnect();
      envelope.disconnect();
    };
    this.activeShimmers.add(source);
    source.start(start, offset);
    source.stop(start + shimmerDuration);
  }
}
