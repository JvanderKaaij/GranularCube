export interface DelaySettings { mix: number; time: number; feedback: number }

/** Alternating, softened echoes with their own return so cloud reverb cannot hide them. */
export class AtmosphericDelay {
  readonly input: GainNode;
  private readonly delays: DelayNode[];
  private readonly filters: BiquadFilterNode[];
  private readonly feedbacks: GainNode[];
  private readonly pans: StereoPannerNode[];
  private readonly wet: GainNode;

  constructor(private readonly context: BaseAudioContext, destination: AudioNode, parameters: DelaySettings) {
    this.input = context.createGain();
    this.delays = [context.createDelay(2), context.createDelay(2)];
    this.filters = [context.createBiquadFilter(), context.createBiquadFilter()];
    this.feedbacks = [context.createGain(), context.createGain()];
    this.pans = [context.createStereoPanner(), context.createStereoPanner()];
    this.wet = context.createGain();
    this.input.connect(this.delays[0]);
    for (let side = 0; side < 2; side++) {
      this.delays[side].delayTime.value = parameters.time;
      this.filters[side].type = 'lowpass';
      this.filters[side].frequency.value = 5000;
      this.filters[side].Q.value = 0.5;
      this.feedbacks[side].gain.value = parameters.feedback;
      this.pans[side].pan.value = side === 0 ? -0.85 : 0.85;
      this.delays[side].connect(this.filters[side]);
      this.filters[side].connect(this.pans[side]).connect(this.wet);
      this.filters[side].connect(this.feedbacks[side]).connect(this.delays[1 - side]);
    }
    this.wet.gain.value = parameters.mix;
    this.wet.connect(destination);
  }

  setMix(value: number): void {
    this.wet.gain.setTargetAtTime(Math.max(0, Math.min(0.8, value)), this.context.currentTime, 0.025);
  }
  setTime(value: number): void {
    for (const delay of this.delays) delay.delayTime.setTargetAtTime(Math.max(0.05, Math.min(1.5, value)), this.context.currentTime, 0.04);
  }
  setFeedback(value: number): void {
    for (const feedback of this.feedbacks) feedback.gain.setTargetAtTime(Math.max(0, Math.min(0.78, value)), this.context.currentTime, 0.025);
  }
  dispose(): void {
    for (const node of [this.input, this.wet, ...this.delays, ...this.filters, ...this.feedbacks, ...this.pans]) node.disconnect();
  }
}
