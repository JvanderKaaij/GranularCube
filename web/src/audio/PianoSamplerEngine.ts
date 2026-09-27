import { pianoDefaults, pianoControls, parsePianoGestures, validatePianoBank, type PianoParameters, type PianoBank, type PianoGesture, type PianoSample } from './PianoProgram';
import { pianoSampleUrl } from '../ai/PianoBankClient';
import { AmbientMotion, type Movement } from './AmbientMotion';
import { parameterLfoValue, type ParameterLfoMap } from './ParameterLfo';

interface Voice { source: AudioBufferSourceNode; envelope: GainNode; panner: StereoPannerNode }
export interface PreparedPianoProgram { validate(): void; commit(): void }
export interface LoadedPianoProgram { bank: PianoBank; gestures: PianoGesture[]; buffers: Map<number, AudioBuffer> }

function validatePianoBuffer(sample: PianoSample, buffer: AudioBuffer | undefined): void {
  if (!buffer?.length) throw new Error(`Piano MIDI ${sample.midi} has no decoded sample`);
  if (sample.loopMode === 'loop_continuous' && sample.loopEndSeconds! > buffer.duration + 1 / buffer.sampleRate) throw new Error(`Piano ${sample.filename}: loop exceeds the decoded recording`);
}

/** Decode each recording once, even when several requested keys share an SFZ region. */
export async function loadPianoBuffers(bank: PianoBank, gestures: PianoGesture[], load: (sample: PianoSample) => Promise<AudioBuffer>, cached = new Map<string, AudioBuffer>()): Promise<Map<number, AudioBuffer>> {
  validatePianoBank(bank);
  const parsed = parsePianoGestures(gestures, bank.samples.map((sample) => sample.midi));
  const buffers = new Map<number, AudioBuffer>();
  const recordings = new Map<string, Promise<AudioBuffer>>();
  await Promise.all([...new Set(parsed.flatMap((gesture) => gesture.notes.map((note) => note.midi)))].map(async (key) => {
    const sample = bank.samples.find((entry) => entry.midi === key)!;
    let pending = recordings.get(sample.filename);
    if (!pending) {
      const existing = cached.get(sample.filename);
      pending = existing ? Promise.resolve(existing) : load(sample);
      recordings.set(sample.filename, pending);
    }
    const buffer = await pending;
    validatePianoBuffer(sample, buffer); buffers.set(key, buffer);
  }));
  return buffers;
}

/** SFZ zones select recordings, transpose from their roots, and optionally loop sustain. */
export class PianoSamplerEngine {
  private readonly output: GainNode;
  private parameters = { ...pianoDefaults };
  private bank: PianoBank = { name: 'Piano', revision: '', samples: [] };
  private gestures: PianoGesture[] = [];
  private buffers = new Map<number, AudioBuffer>();
  private readonly voices = new Set<Voice>();
  private readonly motion = new AmbientMotion(Math.random() * 20);
  private lfos: ParameterLfoMap = {};
  private playing = false;
  private disposed = false;
  private revision = 0;
  private timer: number | null = null;
  private nextGestureTime = 0;
  private previousGesture = -1;
  constructor(private readonly context: AudioContext, destination: AudioNode) {
    this.output = context.createGain(); this.output.gain.value = this.parameters.gain; this.output.connect(destination);
  }
  get isPlaying(): boolean { return this.playing; }
  get currentParameters(): PianoParameters { return { ...this.parameters }; }
  get currentBank(): PianoBank { return structuredClone(this.bank); }
  get currentGestures(): PianoGesture[] { return structuredClone(this.gestures); }
  get currentMovement(): Movement | null { return this.motion.currentSettings; }
  setMovement(movement: Movement | null): void { this.motion.set(movement, this.context.currentTime); }
  setMotionEnabled(enabled: boolean): void { this.motion.enabled = enabled; }
  setParameterLfos(lfos: ParameterLfoMap): void { this.lfos = structuredClone(lfos); }
  setParameter<K extends keyof PianoParameters>(key: K, value: PianoParameters[K]): void {
    const control = pianoControls.find((item) => item.key === key)!;
    if (!Number.isFinite(value)) throw new Error('Piano parameters must be finite');
    this.parameters[key] = Math.max(control.min, Math.min(control.max, value));
    if (key === 'gain') this.applyParameterLfos(this.context.currentTime);
  }
  applyParameterLfos(time: number): void { this.output.gain.setTargetAtTime(this.value('gain', time), time, 0.08); }
  private value(key: keyof PianoParameters, time: number): number {
    const control = pianoControls.find((item) => item.key === key)!;
    return parameterLfoValue(this.parameters[key], key, this.lfos[key], time, control.min, control.max);
  }
  async prepareProgram(bank: PianoBank, requested: PianoGesture[], signal?: AbortSignal): Promise<PreparedPianoProgram> {
    validatePianoBank(bank);
    const gestures = parsePianoGestures(requested, bank.samples.map((sample) => sample.midi));
    const expected = this.revision;
    const cached = new Map<string, AudioBuffer>();
    if (bank.revision === this.bank.revision) for (const sample of this.bank.samples) {
      const buffer = this.buffers.get(sample.midi); if (buffer) cached.set(sample.filename, buffer);
    }
    const buffers = await loadPianoBuffers(bank, gestures, async (sample) => {
      const response = await fetch(pianoSampleUrl(sample.filename, bank.revision), { signal: signal ?? AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`Piano MIDI ${sample.midi}: sample ${sample.filename} is unavailable (${response.status})`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      return buffer;
    }, cached);
    const validate = () => {
      signal?.throwIfAborted();
      if (this.disposed || this.revision !== expected) throw new Error('Piano bank or gestures changed while preparing audio');
    };
    validate();
    return { validate, commit: () => { validate(); this.installProgram({ bank, gestures, buffers }); } };
  }
  installProgram(program: LoadedPianoProgram): void {
    if (this.disposed) throw new Error('Piano sampler was removed');
    validatePianoBank(program.bank);
    const gestures = parsePianoGestures(program.gestures, program.bank.samples.map((sample) => sample.midi));
    for (const gesture of gestures) for (const note of gesture.notes) validatePianoBuffer(program.bank.samples.find((sample) => sample.midi === note.midi)!, program.buffers.get(note.midi));
    this.bank = structuredClone(program.bank); this.gestures = gestures; this.buffers = new Map(program.buffers);
    this.revision++; this.previousGesture = -1;
    if (this.playing) this.nextGestureTime = Math.min(this.nextGestureTime, this.context.currentTime + Math.min(this.parameters.gapMinSeconds, this.parameters.gapMaxSeconds));
    // New chords take over at the next unhurried appearance; currently ringing notes finish.
  }
  async start(): Promise<void> {
    if (!this.gestures.length) throw new Error('Provide piano key samples and refresh the bank first.');
    await this.context.resume();
    if (this.disposed) throw new Error('Piano sampler was removed');
    if (this.playing) return;
    this.playing = true; this.nextGestureTime = this.context.currentTime + 0.15;
    this.tick(); this.timer = window.setInterval(() => this.tick(), 100);
  }
  async preview(index = 0): Promise<void> {
    if (!this.gestures[index]) throw new Error('Load a playable piano bank first.');
    await this.context.resume();
    if (this.disposed) return;
    this.scheduleGesture(this.gestures[index], this.context.currentTime + 0.03);
  }
  private tick(): void {
    if (!this.playing || !this.gestures.length) return;
    const now = this.context.currentTime;
    this.applyParameterLfos(now);
    if (this.nextGestureTime > now + 0.15) return;
    const candidates = this.gestures.map((_, index) => index).filter((index) => this.gestures.length === 1 || index !== this.previousGesture);
    const index = candidates[Math.floor(Math.random() * candidates.length)];
    const at = Math.max(now + 0.02, this.nextGestureTime);
    this.scheduleGesture(this.gestures[index], at); this.previousGesture = index;
    const a = this.value('gapMinSeconds', now), b = this.value('gapMaxSeconds', now);
    this.nextGestureTime = at + Math.min(a, b) + Math.random() * Math.abs(b - a);
  }
  private scheduleGesture(gesture: PianoGesture, at: number): void {
    const scale = 0.85 / Math.sqrt(gesture.notes.length);
    for (const note of gesture.notes) {
      while (this.voices.size >= 48) this.stopVoice(this.voices.values().next().value!);
      const buffer = this.buffers.get(note.midi); if (!buffer) continue;
      const sample = this.bank.samples.find((entry) => entry.midi === note.midi)!;
      const start = at + note.offsetMs / 1000;
      const source = this.context.createBufferSource(); source.buffer = buffer;
      const playbackRate = 2 ** ((note.midi - (sample.rootMidi ?? note.midi)) / 12);
      source.playbackRate.value = playbackRate;
      if (sample.loopMode === 'loop_continuous') {
        source.loop = true;
        source.loopStart = sample.loopStartSeconds!;
        source.loopEnd = Math.min(buffer.duration, sample.loopEndSeconds!);
      }
      const envelope = this.context.createGain(); const panner = this.context.createStereoPanner();
      const duration = source.loop ? Infinity : buffer.duration / playbackRate;
      const hold = Math.min(this.value('holdSeconds', at), Math.max(0, duration - 0.01));
      const end = Math.min(duration, hold + this.value('releaseSeconds', at));
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(note.velocity * scale, start + Math.min(0.005, hold));
      envelope.gain.setValueAtTime(note.velocity * scale, start + hold);
      envelope.gain.linearRampToValueAtTime(0, start + end);
      panner.pan.value = Math.max(-1, Math.min(1, Math.max(-1, Math.min(1, (note.midi - 64) / 30)) * this.value('spread', at) + this.motion.pan(at)));
      source.connect(envelope).connect(panner).connect(this.output);
      const voice = { source, envelope, panner }; this.voices.add(voice);
      source.onended = () => { this.voices.delete(voice); source.disconnect(); envelope.disconnect(); panner.disconnect(); };
      source.start(start); source.stop(start + end);
    }
  }
  private stopVoice(voice: Voice): void {
    const now = this.context.currentTime;
    voice.envelope.gain.cancelScheduledValues(now); voice.envelope.gain.setTargetAtTime(0, now, 0.01);
    try { voice.source.stop(now + 0.05); } catch { /* Already ended. */ }
    this.voices.delete(voice);
  }
  stop(): void {
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer); this.timer = null;
    for (const voice of [...this.voices]) this.stopVoice(voice);
  }
  dispose(): void { this.disposed = true; this.stop(); this.buffers.clear(); this.output.disconnect(); }
}
