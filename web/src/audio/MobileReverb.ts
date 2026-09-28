/** Small stereo Schroeder reverb: constant cost even for twelve-second tails.
 * Feedback sets RT60, so changing decay never builds a long impulse buffer. */
export class MobileReverb {
  readonly input: GainNode;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly nodes: AudioNode[] = [];
  private readonly loops: { gain: GainNode; send: GainNode; seconds: number }[] = [];

  constructor(private context: AudioContext, destination: AudioNode, mix: number, decay: number) {
    this.input = context.createGain(); this.dry = context.createGain(); this.wet = context.createGain();
    this.input.connect(this.dry).connect(destination); this.wet.connect(destination);
    const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 180; highpass.Q.value = -6.0206;
    this.input.connect(highpass); this.nodes.push(highpass);
    for (const [index, seconds] of [0.0297, 0.0371, 0.0411, 0.0437].entries()) {
      const delay = context.createDelay(0.1); delay.delayTime.value = seconds;
      // Web Audio low/high-pass Q is in dB. Positive Q can amplify a band
      // on every trip around the loop, overpowering the feedback attenuation.
      const damp = context.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 4500; damp.Q.value = -6.0206;
      const feedback = context.createGain();
      const send = context.createGain();
      const coefficient = this.feedbackFor(seconds, decay);
      feedback.gain.value = coefficient;
      send.gain.value = (1 - coefficient) / 4;
      highpass.connect(send).connect(delay).connect(damp).connect(feedback).connect(delay);
      const diffuser = context.createBiquadFilter(); diffuser.type = 'allpass'; diffuser.frequency.value = 600 + index * 430; diffuser.Q.value = 0.7;
      const pan = context.createStereoPanner(); pan.pan.value = index % 2 ? 0.8 : -0.8;
      damp.connect(diffuser).connect(pan).connect(this.wet);
      this.loops.push({ gain: feedback, send, seconds }); this.nodes.push(send, delay, damp, feedback, diffuser, pan);
    }
    const amount = Math.max(0, Math.min(1, mix));
    this.dry.gain.value = 1 - amount; this.wet.gain.value = amount * 0.5;
  }
  setMix(mix: number): void {
    const amount = Math.max(0, Math.min(1, mix));
    this.dry.gain.setTargetAtTime(1 - amount, this.context.currentTime, 0.04);
    this.wet.gain.setTargetAtTime(amount * 0.5, this.context.currentTime, 0.04);
  }
  private feedbackFor(delay: number, seconds: number): number {
    const decay = Number.isFinite(seconds) ? Math.max(1, Math.min(12, seconds)) : 4;
    return Math.min(0.995, 10 ** (-3 * delay / decay));
  }
  setDecay(seconds: number, fadeSeconds = 0.3): void {
    const now = this.context.currentTime;
    const smoothing = Math.max(0.04, fadeSeconds / 3);
    for (const loop of this.loops) {
      const coefficient = this.feedbackFor(loop.seconds, seconds);
      loop.gain.gain.setTargetAtTime(coefficient, now, smoothing);
      // Compensate the loop's 1/(1-feedback) resonant gain. Longer tails
      // must not also become much louder, especially with several reverbs.
      loop.send.gain.setTargetAtTime((1 - coefficient) / 4, now, smoothing);
    }
  }
  dispose(): void { for (const node of [this.input, this.dry, this.wet, ...this.nodes]) node.disconnect(); }
}
