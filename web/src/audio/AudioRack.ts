import { masterDefaults, type MasterParameters } from '../parameters';
import { GranularEngine } from './GranularEngine';
import { PhysicalEngine } from './PhysicalEngine';
import { PianoSamplerEngine } from './PianoSamplerEngine';
import { AudioGraph } from './AudioGraph';
import { EffectNode, type EffectKind } from './EffectNode';

export interface RackModule {
  readonly isPlaying: boolean;
  stop(): void;
  dispose(): void;
}

/** Cables are the only path from independent source/effect outputs to master. */
export class AudioRack {
  private readonly context = new AudioContext();
  private readonly output = this.context.createGain();
  readonly graph = new AudioGraph(this.context);
  private readonly modules = new Map<RackModule, { id: string; output: GainNode }>();
  private parameters: MasterParameters = { ...masterDefaults, reverbMix: 0 };

  constructor() {
    this.output.gain.value = this.parameters.gain;
    this.output.connect(this.context.destination);
    this.graph.add('master', { input: this.output });
  }

  get currentParameters(): MasterParameters {
    return { ...this.parameters };
  }
  get currentTime(): number { return this.context.currentTime; }
  async resume(): Promise<void> { await this.context.resume(); }
  async prepareSample(url: string): Promise<AudioBuffer> {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Saved sample could not be loaded (${response.status})`);
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    if (!buffer.length) throw new Error('Saved sample is empty');
    return buffer;
  }

  createGranular(id: string): GranularEngine {
    return this.addModule(id, (context, destination) => new GranularEngine(context, destination));
  }

  createPhysical(id: string): PhysicalEngine {
    return this.addModule(id, (context, destination) => new PhysicalEngine(context, destination));
  }
  createPiano(id: string): PianoSamplerEngine { return this.addModule(id, (context, destination) => new PianoSamplerEngine(context, destination)); }

  createEffect(id: string, kind: EffectKind): EffectNode {
    const effect = new EffectNode(this.context, kind);
    this.graph.add(id, effect);
    return effect;
  }

  addModule<T extends RackModule>(id: string, create: (context: AudioContext, destination: AudioNode) => T): T {
    const output = this.context.createGain();
    const module = create(this.context, output);
    this.graph.add(id, { output });
    this.modules.set(module, { id, output });
    return module;
  }

  removeModule(module: RackModule): void {
    const entry = this.modules.get(module);
    if (!entry) return;
    this.graph.remove(entry.id);
    module.dispose();
    entry.output.disconnect();
    this.modules.delete(module);
  }

  stopAll(): void {
    for (const module of this.modules.keys()) module.stop();
  }

  setParameter<K extends keyof MasterParameters>(key: K, value: MasterParameters[K]): void {
    this.parameters[key] = value;
    if (key === 'gain') {
      this.output.gain.setTargetAtTime(this.parameters.gain, this.context.currentTime, 0.02);
    }
  }

  setModulatedGain(value: number): void {
    this.output.gain.setTargetAtTime(Math.max(0, Math.min(1.5, value)), this.context.currentTime, 0.15);
  }
}
