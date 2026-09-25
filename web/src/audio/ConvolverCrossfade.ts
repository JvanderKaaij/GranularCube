interface ConvolverVoice {
  convolver: ConvolverNode;
  gain: GainNode;
  cleanup: number | null;
}

/** Swaps generated impulse responses without abruptly replacing a live convolver. */
export class ConvolverCrossfade {
  private readonly context: AudioContext;
  private readonly input: AudioNode;
  private readonly outputs: AudioNode[];
  private readonly makeImpulse: (context: AudioContext, seconds: number) => AudioBuffer;
  private readonly voices = new Set<ConvolverVoice>();
  private current: ConvolverVoice;
  private decay: number;

  constructor(
    context: AudioContext,
    input: AudioNode,
    outputs: AudioNode[],
    decay: number,
    makeImpulse: (context: AudioContext, seconds: number) => AudioBuffer,
  ) {
    this.context = context;
    this.input = input;
    this.outputs = outputs;
    this.makeImpulse = makeImpulse;
    this.decay = decay;
    this.current = this.createVoice(decay, 1);
  }

  private createVoice(decay: number, level: number): ConvolverVoice {
    const convolver = this.context.createConvolver();
    convolver.normalize = false;
    convolver.buffer = this.makeImpulse(this.context, decay);
    const gain = this.context.createGain();
    gain.gain.value = level;
    this.input.connect(convolver).connect(gain);
    for (const output of this.outputs) gain.connect(output);
    const voice = { convolver, gain, cleanup: null };
    this.voices.add(voice);
    return voice;
  }

  setDecay(decay: number, fadeSeconds = 0.6): void {
    if (decay === this.decay) return;
    const old = this.current;
    const next = this.createVoice(decay, 0);
    const now = this.context.currentTime;
    const fade = Math.max(0.05, fadeSeconds);
    old.gain.gain.setTargetAtTime(0, now, fade / 5);
    next.gain.gain.setTargetAtTime(1, now, fade / 5);
    old.cleanup = window.setTimeout(() => this.removeVoice(old), (fade + 0.2) * 1000);
    this.current = next;
    this.decay = decay;
  }

  private removeVoice(voice: ConvolverVoice): void {
    if (!this.voices.has(voice)) return;
    if (voice.cleanup !== null) window.clearTimeout(voice.cleanup);
    this.input.disconnect(voice.convolver);
    voice.convolver.disconnect();
    voice.gain.disconnect();
    voice.convolver.buffer = null;
    this.voices.delete(voice);
  }

  dispose(): void {
    for (const voice of [...this.voices]) this.removeVoice(voice);
  }
}
