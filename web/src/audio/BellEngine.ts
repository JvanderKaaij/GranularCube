import { bellDefaults, type BellParameters } from '../parameters';
import { CloudReverb } from './CloudReverb';

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

interface BellVoice {
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

/** A struck modal resonator with position-dependent excitation, noise, and tunable modes. */
export class BellEngine {
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private readonly cloud: CloudReverb;
  private readonly malletNoise: AudioBuffer;
  private readonly voices = new Set<BellVoice>();
  private parameters: BellParameters = { ...bellDefaults };
  private sequence = [...DEFAULT_SEQUENCE];
  private timer: number | null = null;
  private decayTimer: number | null = null;
  private nextStrikeTime = 0;
  private stepIndex = 0;
  private playing = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = this.parameters.gain;
    this.output.connect(destination);
    this.cloud = new CloudReverb(context, this.output, this.parameters.reverbMix, this.parameters.reverbDecay, 0);
    this.malletNoise = makeMalletNoise(context);
  }

  get isPlaying(): boolean { return this.playing; }
  get currentParameters(): BellParameters { return { ...this.parameters }; }
  get currentSequence(): number[] { return [...this.sequence]; }

  setSequence(sequence: number[]): void {
    if (sequence.length === 0) throw new Error('Bell sequence must contain notes');
    this.sequence = [...sequence];
    this.stepIndex = 0;
  }

  setParameter<K extends keyof BellParameters>(key: K, value: BellParameters[K]): void {
    this.parameters[key] = value;
    if (key === 'gain') {
      this.output.gain.setTargetAtTime(this.parameters.gain, this.context.currentTime, 0.02);
    } else if (key === 'reverbMix') {
      this.cloud.setMix(this.parameters.reverbMix);
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
    await this.context.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextStrikeTime = this.context.currentTime + 0.02;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), SCHEDULER_INTERVAL_MS);
  }

  async strike(): Promise<void> {
    await this.context.resume();
    this.scheduleStrike(this.context.currentTime + 0.005, this.parameters.rootNote, 0.85);
  }

  stop(): void {
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
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
    if (this.decayTimer !== null) window.clearTimeout(this.decayTimer);
    this.cloud.dispose();
    this.output.disconnect();
  }

  private schedule(): void {
    if (!this.playing) return;
    const horizon = this.context.currentTime + LOOK_AHEAD_SECONDS;
    let scheduled = 0;
    while (this.nextStrikeTime < horizon && scheduled < MAX_ACTIVE_STRIKES) {
      if (this.voices.size < MAX_ACTIVE_STRIKES) {
        const note = this.parameters.rootNote + this.sequence[this.stepIndex % this.sequence.length];
        const velocity = 0.62 + Math.random() * 0.2;
        this.scheduleStrike(this.nextStrikeTime, note, velocity);
      }
      this.nextStrikeTime += 1 / Math.max(0.2, this.parameters.rate);
      this.stepIndex++;
      scheduled++;
    }
    if (this.nextStrikeTime < this.context.currentTime) this.nextStrikeTime = this.context.currentTime;
  }

  private scheduleStrike(time: number, midiNote: number, velocity: number): void {
    if (this.voices.size >= MAX_ACTIVE_STRIKES) return;
    const context = this.context;
    const p = this.parameters;
    const frequency = noteFrequency(midiNote);
    const panner = context.createStereoPanner();
    panner.pan.value = Math.sin(this.stepIndex * 2.4) * p.spread * 0.7;
    panner.connect(this.cloud.input);
    const voice: BellVoice = { sources: new Set(), panner };
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

    const attack = 0.002 + p.softness * 0.028;
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
      const modeFrequency = frequency * (harmonicRatio + (mode.ratio - harmonicRatio) * p.inharmonicity);
      if (modeFrequency >= context.sampleRate * 0.45) continue;
      const positionResponse = Math.abs(Math.sin(Math.PI * harmonicRatio * p.strikePosition));
      const positionNormalizer = Math.max(0.35, Math.sin(Math.PI * p.strikePosition));
      const strikeWeight = Math.min(1.5, positionResponse / positionNormalizer);
      const brightnessWeight = (0.25 + 1.25 * p.brightness) ** (index / 3);
      const highModeSoftening = 1 - p.softness * (index / (MODES.length - 1)) * 0.86;
      const peak = 0.24 * velocity * mode.amplitude * strikeWeight * brightnessWeight * highModeSoftening;
      if (peak < 0.0002) continue;
      const damping = Math.max(0.12, 1 - p.damping * (index / (MODES.length - 1)) * 0.88);
      const end = time + Math.max(0.16, p.decay * mode.decay * damping);
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
      noiseEnvelope.gain.linearRampToValueAtTime(0.16 * velocity * p.noiseAmount * (1 - p.softness * 0.4), time + 0.002);
      noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, noiseEnd);
      noise.connect(noiseFilter).connect(noiseEnvelope).connect(panner);
      track(noise, [noiseFilter, noiseEnvelope]);
      noise.start(time);
      noise.stop(noiseEnd + 0.005);
    }

  }
}
