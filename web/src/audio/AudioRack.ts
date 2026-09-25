import { masterDefaults, type MasterParameters } from '../parameters';
import { GranularEngine } from './GranularEngine';
import { BellEngine } from './BellEngine';
import { MasterReverb } from './MasterReverb';

export interface RackModule {
  readonly isPlaying: boolean;
  stop(): void;
  dispose(): void;
}

/** One AudioContext, parallel synth inputs, and a shared master effects path. */
export class AudioRack {
  private readonly context = new AudioContext();
  private readonly bus = this.context.createGain();
  private readonly output = this.context.createGain();
  private readonly reverb: MasterReverb;
  private readonly modules = new Set<RackModule>();
  private parameters: MasterParameters = { ...masterDefaults };
  private decayTimer: number | null = null;

  constructor() {
    this.output.gain.value = this.parameters.gain;
    this.output.connect(this.context.destination);
    this.reverb = new MasterReverb(
      this.context,
      this.output,
      this.parameters.reverbMix,
      this.parameters.reverbDecay,
    );
    this.bus.connect(this.reverb.input);
  }

  get currentParameters(): MasterParameters {
    return { ...this.parameters };
  }

  createGranular(): GranularEngine {
    return this.addModule((context, destination) => new GranularEngine(context, destination));
  }

  createBell(): BellEngine {
    return this.addModule((context, destination) => new BellEngine(context, destination));
  }

  addModule<T extends RackModule>(create: (context: AudioContext, destination: AudioNode) => T): T {
    const module = create(this.context, this.bus);
    this.modules.add(module);
    return module;
  }

  removeModule(module: RackModule): void {
    if (!this.modules.delete(module)) return;
    module.dispose();
  }

  stopAll(): void {
    for (const module of this.modules) module.stop();
  }

  setParameter<K extends keyof MasterParameters>(key: K, value: MasterParameters[K]): void {
    this.parameters[key] = value;
    if (key === 'gain') {
      this.output.gain.setTargetAtTime(this.parameters.gain, this.context.currentTime, 0.02);
    } else if (key === 'reverbMix') {
      this.reverb.setMix(this.parameters.reverbMix);
    } else if (key === 'reverbDecay') {
      if (this.decayTimer !== null) window.clearTimeout(this.decayTimer);
      this.decayTimer = window.setTimeout(() => {
        this.reverb.setDecay(this.parameters.reverbDecay);
        this.decayTimer = null;
      }, 180);
    }
  }

  transitionReverbDecay(seconds: number, fadeSeconds: number): void {
    if (this.decayTimer !== null) window.clearTimeout(this.decayTimer);
    this.decayTimer = null;
    this.reverb.setDecay(seconds, fadeSeconds);
  }
}
