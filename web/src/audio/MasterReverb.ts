import { ConvolverCrossfade } from './ConvolverCrossfade';

/** A small stereo room impulse, generated locally so the site needs no IR file. */
function makeImpulse(context: AudioContext, decaySeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.ceil((decaySeconds + 0.1) * sampleRate);
  const impulse = context.createBuffer(2, length, sampleRate);
  const earlyReflections = [0.122, 0.135, 0.146, 0.155, 0.184];

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let dampedNoise = 0;
    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      dampedNoise = 0.66 * dampedNoise + 0.34 * (Math.random() * 2 - 1);
      const tail = Math.exp((-6.9 * time) / decaySeconds);
      data[i] = time < 0.025 ? 0 : (1.6 / Math.sqrt(sampleRate)) * dampedNoise * tail;
    }
    earlyReflections.forEach((delay, index) => {
      const position = Math.round((delay + channel * 0.004 * (index % 2 ? 1 : -1)) * sampleRate);
      data[position] += (0.13 - index * 0.016) * (channel === 0 || index % 2 === 0 ? 1 : -1);
    });
  }
  return impulse;
}

export class MasterReverb {
  readonly input: GainNode;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly convolution: ConvolverCrossfade;
  private readonly context: AudioContext;

  constructor(context: AudioContext, destination: AudioNode, mix: number, decaySeconds: number) {
    this.context = context;
    this.input = context.createGain();
    this.dry = context.createGain();
    this.wet = context.createGain();
    this.input.connect(this.dry).connect(destination);
    this.wet.connect(destination);
    this.convolution = new ConvolverCrossfade(context, this.input, [this.wet], decaySeconds, makeImpulse);
    this.setMix(mix);
  }

  setMix(mix: number): void {
    const now = this.context.currentTime;
    const clamped = Math.max(0, Math.min(1, mix));
    this.dry.gain.setTargetAtTime(1 - clamped, now, 0.02);
    this.wet.gain.setTargetAtTime(clamped, now, 0.02);
  }

  setDecay(seconds: number, fadeSeconds?: number): void {
    this.convolution.setDecay(seconds, fadeSeconds);
  }
}
