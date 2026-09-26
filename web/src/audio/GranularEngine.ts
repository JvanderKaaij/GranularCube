import { defaults, type Parameters } from '../parameters';
import { AmbientMotion, type Movement } from './AmbientMotion';
import type { ParameterLfoMap } from './ParameterLfo';

const LOOK_AHEAD_SECONDS = 0.12;
const SCHEDULER_INTERVAL_MS = 25;
const MAX_ACTIVE_GRAINS = 64;
const FIXED_PLAYBACK_RATE = 1;
const FIXED_ENVELOPE_SLOPE = 0.5;
const SAMPLE_BLEND_SECONDS = 2;
const MAX_SAMPLE_BLEND_SECONDS = 1.2;

function between(a: number, b: number): number {
  return Math.min(a, b) + Math.random() * Math.abs(b - a);
}

export class GranularEngine {
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private buffer: AudioBuffer | null = null;
  private previousBuffer: AudioBuffer | null = null;
  private previousSelectionStart = 0;
  private previousSelectionEnd = 0;
  private sampleBlendStart = 0;
  private sampleBlendSeconds = SAMPLE_BLEND_SECONDS;
  private pendingNewSampleGrain = false;
  private timer: number | null = null;
  private nextGrainTime = 0;
  private activeGrains = new Set<AudioBufferSourceNode>();
  private playing = false;
  private sampleRequest = 0;
  private parameters: Parameters = { ...defaults };
  private readonly motion = new AmbientMotion(Math.random() * 20);
  private disposed = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = this.parameters.gain;
    this.output.connect(destination);

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
    const decoded = await this.prepareSample(url);
    if (request !== this.sampleRequest || this.disposed) return this.sampleDurationMs;
    return this.commitSample(decoded, blendSeconds);
  }

  async prepareSample(url: string, signal?: AbortSignal): Promise<AudioBuffer> {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Sample request failed (${response.status})`);
    const bytes = await response.arrayBuffer();
    const decoded = await this.context.decodeAudioData(bytes);
    if (decoded.length === 0) throw new Error('The sample is empty');
    signal?.throwIfAborted();
    return decoded;
  }

  commitSample(decoded: AudioBuffer, blendSeconds = SAMPLE_BLEND_SECONDS): number {
    if (this.disposed) throw new Error('Instrument was removed');
    ++this.sampleRequest;

    // Blend source choices for newly scheduled grains; existing grains keep ringing.
    this.previousBuffer = this.playing ? this.buffer : null;
    this.previousSelectionStart = this.parameters.selectionStart;
    this.previousSelectionEnd = this.parameters.selectionEnd;
    this.sampleBlendStart = this.context.currentTime;
    // A sample swap is a short handoff, independent of the longer parameter morph.
    this.sampleBlendSeconds = Math.min(MAX_SAMPLE_BLEND_SECONDS, Math.max(0.1, blendSeconds));
    this.buffer = decoded;
    this.parameters.selectionStart = 0;
    this.parameters.selectionEnd = decoded.duration * 1000;
    // At low grain density the scheduler may otherwise wait many seconds on its old clock.
    if (this.playing) {
      this.nextGrainTime = this.context.currentTime + 0.02;
      this.pendingNewSampleGrain = true;
    }
    return this.sampleDurationMs;
  }

  setMovement(movement: Movement | null): void { this.motion.set(movement, this.context.currentTime); }
  setMotionEnabled(enabled: boolean): void { this.motion.enabled = enabled; }
  setParameterLfos(settings: ParameterLfoMap): void { this.motion.setParameterLfos(settings); }

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
    }
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
    for (const source of this.activeGrains) {
      try { source.stop(); } catch { /* Already stopped. */ }
    }
    this.activeGrains.clear();
    this.previousBuffer = null;
  }

  dispose(): void {
    this.disposed = true;
    ++this.sampleRequest;
    this.stop();
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
        const moving = this.motion.granular(this.parameters, this.nextGrainTime, this.sampleDurationMs);
        this.output.gain.setTargetAtTime(moving.gain, Math.max(context.currentTime, this.nextGrainTime), 0.08);
        let selectionStart = moving.selectionStart;
        let selectionEnd = moving.selectionEnd;
        if (this.previousBuffer) {
          const blend = Math.max(0, Math.min(1, (this.nextGrainTime - this.sampleBlendStart) / this.sampleBlendSeconds));
          if (this.pendingNewSampleGrain) {
            this.pendingNewSampleGrain = false;
          } else if (blend >= 1) {
            this.previousBuffer = null;
          } else if (Math.random() >= blend) {
            sourceBuffer = this.previousBuffer;
            selectionStart = this.previousSelectionStart;
            selectionEnd = this.previousSelectionEnd;
          }
        }
        this.scheduleGrain(this.nextGrainTime, sourceBuffer, selectionStart, selectionEnd);
      }
      this.nextGrainTime += 1 / Math.max(0.1, this.motion.granular(this.parameters, this.nextGrainTime, this.sampleDurationMs).density);
      scheduled++;
    }
    if (this.nextGrainTime < context.currentTime) {
      this.nextGrainTime = context.currentTime;
    }
  }

  private scheduleGrain(time: number, buffer: AudioBuffer | null, selectionStart: number, selectionEnd: number): void {
    const context = this.context;
    if (!buffer) return;
    const p = this.motion.granular(this.parameters, time, this.sampleDurationMs);

    const requestedDuration = between(p.lengthMin, p.lengthMax) / 1000;
    const low = Math.max(0, Math.min(selectionStart, selectionEnd) / 1000);
    const high = Math.min(buffer.duration, Math.max(selectionStart, selectionEnd) / 1000);
    const offset = between(Math.min(low, buffer.duration), Math.max(low, high));
    const duration = Math.min(requestedDuration, buffer.duration - offset);
    if (duration <= 0.002) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = FIXED_PLAYBACK_RATE;

    const envelope = context.createGain();
    const amplitude = between(p.ampMin, p.ampMax);
    const attack = Math.max(0.002, duration * FIXED_ENVELOPE_SLOPE * 0.5);
    const release = Math.max(0.002, duration * FIXED_ENVELOPE_SLOPE * 0.5);
    const grainStart = Math.max(time, context.currentTime);
    envelope.gain.setValueAtTime(0, grainStart);
    envelope.gain.linearRampToValueAtTime(amplitude, grainStart + attack);
    envelope.gain.setValueAtTime(amplitude, grainStart + duration - release);
    envelope.gain.linearRampToValueAtTime(0, grainStart + duration);

    const panner = context.createStereoPanner();
    panner.pan.value = this.motion.pan(time);
    source.connect(envelope).connect(panner).connect(this.output);
    source.onended = () => {
      this.activeGrains.delete(source);
      source.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
    this.activeGrains.add(source);
    source.start(grainStart, offset);
    source.stop(grainStart + duration);
  }

}
