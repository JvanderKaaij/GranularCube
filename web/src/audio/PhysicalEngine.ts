import { audioLookAhead, startAudioClock } from './AudioClock';
import { physicalDefaults, type PhysicalParameters } from '../parameters';
import { AmbientMotion, type Movement } from './AmbientMotion';
import type { ParameterLfoMap } from './ParameterLfo';

const SCHEDULER_INTERVAL_MS = 25;
const LOOK_AHEAD_SECONDS = 0.12;
const MAX_ACTIVE_STRIKES = 24;
const DEFAULT_SEQUENCE = [0, 7, 12, 4, 9, 2, 7, 14];
const MODES = [
  { ratio: 1, amplitude: 1, decay: 1 },
  { ratio: 2, amplitude: 0.42, decay: 0.73 },
  { ratio: 2.4, amplitude: 0.22, decay: 0.54 },
  { ratio: 3.01, amplitude: 0.14, decay: 0.4 },
  { ratio: 4.16, amplitude: 0.09, decay: 0.31 },
  { ratio: 5.43, amplitude: 0.06, decay: 0.24 },
  { ratio: 6.79, amplitude: 0.035, decay: 0.19 },
];
const PERCUSSION_RATIOS = [1, 1.57, 2.31, 3.18, 4.42, 5.83, 7.61];

interface PhysicalVoice {
  sources: Set<AudioScheduledSourceNode>;
  panner: StereoPannerNode;
}

function noteFrequency(midiNote: number): number {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

function makeMalletNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.85), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A physical-style modal resonator with bell, percussive-body, and plucked-string modes. */
export class PhysicalEngine {
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private readonly malletNoise: AudioBuffer;
  private readonly voices = new Set<PhysicalVoice>();
  private parameters: PhysicalParameters = { ...physicalDefaults };
  private readonly motion = new AmbientMotion(Math.random() * 20);
  private sequence = [...DEFAULT_SEQUENCE];
  private timer: (() => void) | null = null;
  private nextStrikeTime = 0;
  private stepIndex = 0;
  private playing = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = this.parameters.gain;
    this.output.connect(destination);
    this.malletNoise = makeMalletNoise(context);
  }

  get isPlaying(): boolean { return this.playing; }
  get currentParameters(): PhysicalParameters { return { ...this.parameters }; }
  get currentSequence(): number[] { return [...this.sequence]; }
  get currentMovement(): Movement | null { return this.motion.currentSettings; }
  setMovement(movement: Movement | null): void { this.motion.set(movement, this.context.currentTime); }
  setMotionEnabled(enabled: boolean): void { this.motion.enabled = enabled; }
  setParameterLfos(settings: ParameterLfoMap): void { this.motion.setParameterLfos(settings); }

  setSequence(sequence: number[]): void {
    if (sequence.length === 0) throw new Error('Physical sequence must contain notes');
    this.sequence = [...sequence];
    this.stepIndex = 0;
  }

  setParameter<K extends keyof PhysicalParameters>(key: K, value: PhysicalParameters[K]): void {
    this.parameters[key] = value;
    if (key === 'gain') this.output.gain.setTargetAtTime(this.parameters.gain, this.context.currentTime, 0.02);
  }

  async start(): Promise<void> {
    await this.context.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextStrikeTime = this.context.currentTime + 0.02;
    this.schedule();
    this.timer = startAudioClock(this.context, () => this.schedule(), SCHEDULER_INTERVAL_MS);
  }

  async strike(): Promise<void> {
    await this.context.resume();
    this.scheduleStrike(this.context.currentTime + 0.005, this.parameters.rootNote, 0.85);
  }

  stop(): void {
    this.playing = false;
    if (this.timer !== null) this.timer();
    this.timer = null;
    for (const voice of this.voices) {
      for (const source of voice.sources) {
        try { source.stop(); } catch { /* Already ended. */ }
      }
    }
    this.voices.clear();
  }

  dispose(): void {
    this.stop();
    this.output.disconnect();
  }

  private schedule(): void {
    if (!this.playing) return;
    this.nextStrikeTime = Math.max(this.nextStrikeTime, this.context.currentTime);
    const horizon = this.context.currentTime + audioLookAhead(this.context, LOOK_AHEAD_SECONDS);
    let scheduled = 0;
    while (this.nextStrikeTime < horizon && scheduled < MAX_ACTIVE_STRIKES) {
      if (this.voices.size < MAX_ACTIVE_STRIKES) {
        const note = this.parameters.rootNote + this.sequence[this.stepIndex % this.sequence.length];
        const velocity = 0.62 + Math.random() * 0.2;
        this.scheduleStrike(this.nextStrikeTime, note, velocity);
      }
      this.nextStrikeTime += 1 / Math.max(0.2, this.motion.physical(this.parameters, this.nextStrikeTime).rate);
      this.stepIndex++;
      scheduled++;
    }
    if (this.nextStrikeTime < this.context.currentTime) this.nextStrikeTime = this.context.currentTime;
  }

  private scheduleStrike(time: number, midiNote: number, velocity: number): void {
    if (this.voices.size >= MAX_ACTIVE_STRIKES) return;
    const context = this.context;
    const p = this.motion.physical(this.parameters, time);
    this.output.gain.setTargetAtTime(p.gain, Math.max(context.currentTime, time), 0.08);
    const frequency = noteFrequency(midiNote);
    const panner = context.createStereoPanner();
    panner.pan.value = Math.sin(this.stepIndex * 2.4) * p.spread * 0.7;
    panner.connect(this.output);
    const voice: PhysicalVoice = { sources: new Set(), panner };
    this.voices.add(voice);

    const track = (source: AudioScheduledSourceNode, nodes: AudioNode[]): void => {
      voice.sources.add(source);
      source.onended = () => {
        voice.sources.delete(source);
        source.disconnect();
        for (const node of nodes) node.disconnect();
        if (voice.sources.size === 0) {
          panner.disconnect();
          this.voices.delete(voice);
        }
      };
    };

    const attack = p.model === 'percussion' ? 0.001 + p.softness * 0.012 : 0.002 + p.softness * 0.028;
    const addTone = (toneFrequency: number, peak: number, end: number, detune = 0): void => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = toneFrequency;
      oscillator.detune.value = detune;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.linearRampToValueAtTime(Math.max(0.0002, peak), time + attack);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(envelope).connect(panner);
      track(oscillator, [envelope]);
      oscillator.start(time);
      oscillator.stop(end + 0.01);
    };

    for (const [index, mode] of MODES.entries()) {
      const harmonicRatio = index + 1;
      const modelRatio = p.model === 'string' ? harmonicRatio : p.model === 'percussion' ? PERCUSSION_RATIOS[index] : mode.ratio;
      const modeAmplitude = p.model === 'string' ? 1 / (index + 1) : p.model === 'percussion' ? [1, 0.72, 0.55, 0.42, 0.32, 0.24, 0.18][index] : mode.amplitude;
      const modeDecay = p.model === 'string' ? 1 : p.model === 'percussion' ? [1, 0.68, 0.48, 0.34, 0.24, 0.18, 0.13][index] : mode.decay;
      const modeFrequency = frequency * (harmonicRatio + (modelRatio - harmonicRatio) * p.inharmonicity);
      if (modeFrequency >= context.sampleRate * 0.45) continue;
      const positionResponse = Math.abs(Math.sin(Math.PI * harmonicRatio * p.strikePosition));
      const positionNormalizer = Math.max(0.35, Math.sin(Math.PI * p.strikePosition));
      const strikeWeight = Math.min(1.5, positionResponse / positionNormalizer);
      const brightnessWeight = (0.25 + 1.25 * p.brightness) ** (index / 3);
      const highModeSoftening = 1 - p.softness * (index / (MODES.length - 1)) * 0.86;
      const peak = 0.24 * velocity * modeAmplitude * strikeWeight * brightnessWeight * highModeSoftening;
      if (peak < 0.0002) continue;
      const damping = Math.max(0.12, 1 - p.damping * (index / (MODES.length - 1)) * 0.88);
      const end = time + Math.max(0.045, p.decay * modeDecay * damping * (p.model === 'percussion' ? 0.42 : 1));
      addTone(modeFrequency, peak * (1 - p.beating * 0.25), end);
      if (p.beating > 0.01) addTone(modeFrequency, peak * p.beating * 0.25, end, 3 + 22 * p.beating);
    }

    if (p.body > 0.001) {
      addTone(frequency * 0.5, 0.08 * velocity * p.body, time + Math.max(0.2, p.decay * 0.8));
    }

    if (p.noiseAmount > 0.001) {
      const noise = context.createBufferSource();
      noise.buffer = this.malletNoise;
      const noiseFilter = context.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 250 * (14000 / 250) ** p.noiseColor;
      const noiseEnvelope = context.createGain();
      const noiseEnd = time + p.noiseDecay;
      noiseEnvelope.gain.setValueAtTime(0.0001, time);
      noiseEnvelope.gain.linearRampToValueAtTime(0.16 * velocity * p.noiseAmount * (p.model === 'percussion' ? 2.2 : 1) * (1 - p.softness * 0.4), time + 0.002);
      noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, noiseEnd);
      noise.connect(noiseFilter).connect(noiseEnvelope).connect(panner);
      track(noise, [noiseFilter, noiseEnvelope]);
      noise.start(time);
      noise.stop(noiseEnd + 0.005);
    }

  }
}
