import { ConvolverCrossfade } from './ConvolverCrossfade';

/** A diffuse, slowly moving tail. Octave-up grains can enter through shimmerInput. */
function makeCloudImpulse(context: AudioContext, decaySeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.ceil((decaySeconds + 0.1) * sampleRate);
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let softenedNoise = 0;
    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      softenedNoise = 0.72 * softenedNoise + 0.28 * (Math.random() * 2 - 1);
      const swell = 1 - Math.exp(-time / 0.07);
      const tail = Math.exp((-6.9 * time) / decaySeconds);
      data[i] = 0.009 * softenedNoise * swell * tail;
    }
  }
  return impulse;
}

export class CloudReverb {
  readonly input: GainNode;
  readonly shimmerInput: GainNode;
  private readonly context: AudioContext;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly wetSource: GainNode;
  private readonly preDelay: DelayNode;
  private readonly highpass: BiquadFilterNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly convolution: ConvolverCrossfade;
  private readonly delays: DelayNode[] = [];
  private readonly modulators: OscillatorNode[] = [];
  private readonly modulationDepths: GainNode[] = [];
  private readonly pans: StereoPannerNode[] = [];

  constructor(context: AudioContext, destination: AudioNode, mix: number, decay: number, shimmer: number) {
    this.context = context;
    this.input = context.createGain();
    this.shimmerInput = context.createGain();
    this.dry = context.createGain();
    this.wet = context.createGain();
    this.wetSource = context.createGain();
    this.preDelay = context.createDelay(0.2);
    this.highpass = context.createBiquadFilter();
    this.lowpass = context.createBiquadFilter();

    this.preDelay.delayTime.value = 0.065;
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 180;
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 8500;

    this.input.connect(this.dry).connect(destination);
    this.input.connect(this.wetSource);
    this.shimmerInput.connect(this.wetSource);
    this.wetSource.connect(this.preDelay).connect(this.highpass).connect(this.lowpass);

    for (const [delaySeconds, speed, pan] of [[0.026, 0.09, -0.65], [0.039, 0.13, 0.65]]) {
      const delay = context.createDelay(0.08);
      delay.delayTime.value = delaySeconds;
      const modulator = context.createOscillator();
      modulator.frequency.value = speed;
      const depth = context.createGain();
      depth.gain.value = 0.005;
      modulator.connect(depth).connect(delay.delayTime);
      modulator.start();
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      delay.connect(panner).connect(this.wet);
      this.delays.push(delay);
      this.modulators.push(modulator);
      this.modulationDepths.push(depth);
      this.pans.push(panner);
    }
    this.convolution = new ConvolverCrossfade(context, this.lowpass, this.delays, decay, makeCloudImpulse);
    this.wet.connect(destination);
    const initialMix = Math.max(0, Math.min(1, mix));
    this.dry.gain.value = 1 - initialMix;
    this.wet.gain.value = initialMix * 0.5;
    this.shimmerInput.gain.value = Math.max(0, Math.min(1, shimmer));
  }

  setMix(mix: number): void {
    const amount = Math.max(0, Math.min(1, mix));
    const now = this.context.currentTime;
    this.dry.gain.setTargetAtTime(1 - amount, now, 0.02);
    this.wet.gain.setTargetAtTime(amount * 0.5, now, 0.02);
  }

  setShimmer(amount: number): void {
    this.shimmerInput.gain.setTargetAtTime(Math.max(0, Math.min(1, amount)), this.context.currentTime, 0.02);
  }

  setDecay(seconds: number, fadeSeconds?: number): void {
    this.convolution.setDecay(Math.max(1, Math.min(12, seconds)), fadeSeconds);
  }

  dispose(): void {
    for (const modulator of this.modulators) modulator.stop();
    this.convolution.dispose();
    for (const node of [
      this.input, this.shimmerInput, this.dry, this.wet, this.wetSource, this.preDelay,
      this.highpass, this.lowpass, ...this.delays,
      ...this.modulators, ...this.modulationDepths, ...this.pans,
    ]) node.disconnect();
  }
}
