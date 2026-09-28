import { AudioRack } from './AudioRack';
import type { GranularEngine } from './GranularEngine';
import type { PhysicalEngine } from './PhysicalEngine';
import { loadPianoBuffers, type PianoSamplerEngine } from './PianoSamplerEngine';
import type { EffectNode } from './EffectNode';
import { parameterLfoValue } from './ParameterLfo';
import { migratePianoPauses, validateSetup, type PatchSetup } from '../config/Setup';
import { sampleUrl } from '../config/SetupClient';
import { pianoSampleUrl } from '../ai/PianoBankClient';
import type { PatchSnapshot, PatchPlan, ModuleSnapshot, ModulePlan } from '../ai/PatchPlan';
import { parameterIsIgnored, sampleIsFixed, preservePlanParameters } from '../ai/ParameterPolicy';
import { fitSampleWindow, morphParameters } from '../ai/PatchTransition';
import type { Movement } from './AmbientMotion';

type Voice = { id: number; enabled: boolean } & (
  { type: 'granular'; engine: GranularEngine; sample: string } |
  { type: 'physical'; engine: PhysicalEngine } |
  { type: 'piano_sampler'; engine: PianoSamplerEngine }
);

/** The saved graph, synths and modulation without any editor elements or slider state. */
export class HeadlessPatch {
  private readonly rack = new AudioRack(true);
  private readonly voices = new Map<number, Voice>();
  private readonly effects = new Map<string, EffectNode>();
  private setup: PatchSetup | null = null;
  private timer: (() => void) | null = null;
  private disposed = false;
  private transition: AbortController | null = null;
  private playing = false;
  private transportRevision = 0;

  get isPlaying(): boolean { return this.playing; }
  get audioRunning(): boolean { return this.rack.state === 'running'; }
  get warnings(): string[] { return [...this.effects.values()].filter((effect) => effect.type === 'spectral' && effect.status.includes('unavailable')).map((effect) => effect.status); }
  /** Call directly from the tap handler, before a network request or other await. */
  unlock(): Promise<void> { return this.rack.resume(); }

  async load(saved: PatchSetup, signal?: AbortSignal): Promise<void> {
    if (this.setup) throw new Error('A player instance can load one setup.');
    const setup = migratePianoPauses(structuredClone(saved)); validateSetup(setup);
    // Prepare every recording before creating a live graph.
    const prepared = await Promise.all(setup.modules.map(async (source) => {
      if (source.type === 'granular') {
        const buffer = await this.rack.prepareSample(sampleUrl(source.sample), signal);
        if (source.parameters.selectionStart > buffer.duration * 1000 + 1 || source.parameters.selectionEnd > buffer.duration * 1000 + 1) throw new Error(`Sample for GRAIN ${source.id} is shorter than its saved window.`);
        return { source, buffer };
      }
      if (source.type === 'piano_sampler') {
        const buffers = await loadPianoBuffers(source.bank, source.gestures, (sample) => this.rack.prepareSample(pianoSampleUrl(sample.filename, source.bank.revision), signal));
        return { source, buffers };
      }
      return { source };
    }));
    signal?.throwIfAborted();
    if (this.disposed) throw new Error('Player was closed.');
    for (const preparedSource of prepared) {
      const { source } = preparedSource;
      let voice: Voice;
      if (source.type === 'granular') {
        const engine = this.rack.createGranular(`source:${source.id}`);
        engine.commitSample(preparedSource.buffer!, 0);
        for (const key of Object.keys(source.parameters) as (keyof typeof source.parameters)[]) engine.setParameter(key, source.parameters[key]);
        voice = { id: source.id, type: source.type, engine, sample: source.sample.name, enabled: source.playing };
      } else if (source.type === 'physical') {
        const engine = this.rack.createPhysical(`source:${source.id}`);
        for (const key of Object.keys(source.parameters) as (keyof typeof source.parameters)[]) engine.setParameter(key, source.parameters[key]);
        engine.setSequence(source.sequence);
        voice = { id: source.id, type: source.type, engine, enabled: source.playing };
      } else {
        const engine = this.rack.createPiano(`source:${source.id}`);
        engine.installProgram({ bank: source.bank, gestures: source.gestures, buffers: preparedSource.buffers! });
        for (const key of Object.keys(source.parameters) as (keyof typeof source.parameters)[]) engine.setParameter(key, source.parameters[key]);
        voice = { id: source.id, type: source.type, engine, enabled: source.playing };
      }
      voice.engine.setParameterLfos(setup.lfos[`source:${source.id}`]);
      voice.engine.setMotionEnabled(setup.mood.evolutionEnabled);
      voice.engine.setMovement(source.movement ?? null);
      this.voices.set(source.id, voice);
    }
    for (const savedEffect of setup.effects) {
      const effect = this.rack.createEffect(savedEffect.id, savedEffect.type);
      effect.apply(savedEffect.parameters); effect.setBypass(savedEffect.bypass); effect.setParameterLfos(setup.lfos[savedEffect.id]);
      this.effects.set(savedEffect.id, effect);
    }
    for (const edge of setup.connections) this.rack.graph.connect(edge.from, edge.to);
    for (const key of Object.keys(setup.master) as (keyof typeof setup.master)[]) this.rack.setParameter(key, setup.master[key]);
    // A setup saved while all transports were stopped can still be auditioned with Listen.
    if (![...this.voices.values()].some((voice) => voice.enabled)) for (const voice of this.voices.values()) voice.enabled = true;
    this.setup = setup;
    this.timer = this.rack.schedule(() => this.modulate(), 100);
  }

  snapshot(): PatchSnapshot {
    if (!this.setup) throw new Error('Choose a saved setup first.');
    const modules: ModuleSnapshot[] = [...this.voices.values()].map((voice) => {
      const common = { id: voice.id, label: `${voice.type} ${voice.id}`, playing: voice.engine.isPlaying };
      if (voice.type === 'granular') return { ...common, type: voice.type, parameters: voice.engine.currentParameters, sample: voice.sample, sampleDurationMs: voice.engine.sampleDurationMs };
      if (voice.type === 'physical') return { ...common, type: voice.type, parameters: voice.engine.currentParameters, sequence: voice.engine.currentSequence };
      return { ...common, type: voice.type, parameters: voice.engine.currentParameters, bank: voice.engine.currentBank, gestures: voice.engine.currentGestures };
    });
    return { master: this.rack.currentParameters, modules,
      effects: [...this.effects].map(([id, effect]) => ({ id, type: effect.type, parameters: effect.parameters, bypass: effect.bypass })),
      connections: this.rack.graph.connections,
      ignoredNodes: Object.entries(this.setup.layout).filter(([, node]) => node.ignoreLlm).map(([id]) => id),
      ignoredParameters: Object.fromEntries(Object.entries(this.setup.layout).map(([id, node]) => [id, node.ignoredParameters ?? []])) };
  }

  private modulate(): void {
    if (!this.setup || this.disposed || !this.playing) return;
    const time = this.rack.currentTime;
    for (const effect of this.effects.values()) effect.applyParameterLfos(time);
    this.rack.setModulatedGain(parameterLfoValue(this.rack.currentParameters.gain, 'master-gain', this.setup.lfos.master.gain, time, 0, 1.5));
  }

  async start(): Promise<void> {
    const revision = ++this.transportRevision;
    await this.unlock();
    if (!this.setup || this.disposed || revision !== this.transportRevision) return;
    this.playing = true;
    for (const voice of this.voices.values()) {
      if (!this.playing || revision !== this.transportRevision) return;
      if (voice.enabled && (voice.type !== 'piano_sampler' || voice.engine.currentGestures.length)) {
        await voice.engine.start();
        if (revision !== this.transportRevision) voice.engine.stop();
      }
    }
  }
  async pause(): Promise<void> {
    this.transportRevision++;
    this.transition?.abort(); this.playing = false; this.rack.stopAll();
    await this.rack.suspend();
  }

  async apply(requested: PatchPlan, generated: Map<number, { keyword: string; audioUrl: string }>, movement: Movement,
    signal: AbortSignal, onPhase: (phase: 'preparing' | 'transition', progress?: number) => void): Promise<void> {
    signal.throwIfAborted();
    const snapshot = this.snapshot(); const expected = JSON.stringify(snapshot);
    const plan = preservePlanParameters({ ...requested,
      modules: requested.modules.filter((module) => !snapshot.ignoredNodes?.includes(`source:${module.id}`)),
      effects: requested.effects?.filter((effect) => !snapshot.ignoredNodes?.includes(effect.id)) }, snapshot);
    onPhase('preparing');
    const prepared = await Promise.all(plan.modules.map(async (target) => {
      const voice = this.voices.get(target.id)!;
      if (!voice || voice.type !== target.type) throw new Error('The setup changed while composing.');
      if (target.type === 'granular' && voice.type === 'granular') {
        const sound = sampleIsFixed(snapshot, target.id) ? undefined : generated.get(target.id);
        const changed = Boolean(sound) || target.sample !== voice.sample;
        const buffer = changed ? await this.rack.prepareSample(sound?.audioUrl ?? sampleUrl({ kind: 'builtin', filename: target.sample }), signal) : null;
        const duration = buffer ? buffer.duration * 1000 : voice.engine.sampleDurationMs;
        return { target: { ...target, parameters: fitSampleWindow(target.parameters, duration, changed) } as ModulePlan, voice, buffer, sound };
      }
      if (target.type === 'piano_sampler' && voice.type === 'piano_sampler') return { target, voice, piano: await voice.engine.prepareProgram(voice.engine.currentBank, target.gestures, signal) };
      return { target, voice };
    }));
    signal.throwIfAborted();
    if (this.disposed || JSON.stringify(this.snapshot()) !== expected) throw new Error('The setup changed while preparing the soundscape.');
    for (const item of prepared) item.piano?.validate();
    const seconds = this.setup!.mood.transitionSeconds;
    for (const item of prepared) {
      item.voice.engine.setMovement(null);
      if (item.voice.type === 'granular' && item.buffer && item.target.type === 'granular') {
        item.voice.engine.commitSample(item.buffer, seconds);
        item.voice.sample = item.sound ? `AI · ${item.sound.keyword}` : item.target.sample;
      }
    }
    const from = this.snapshot();
    this.transition?.abort();
    const transition = new AbortController(); this.transition = transition;
    const abort = () => transition.abort(); signal.addEventListener('abort', abort, { once: true });
    onPhase('transition', 0);
    let midpoint = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const started = performance.now(); let timer: number | undefined;
        const finish = () => { window.clearTimeout(timer); transition.signal.removeEventListener('abort', canceled); resolve(); };
        const canceled = () => { window.clearTimeout(timer); reject(new DOMException('Composition canceled', 'AbortError')); };
        transition.signal.addEventListener('abort', canceled, { once: true });
        const tick = () => {
          if (transition.signal.aborted || this.disposed) { canceled(); return; }
          try {
            const progress = Math.min(1, (performance.now() - started) / (seconds * 1000));
            for (const item of prepared) {
              const before = from.modules.find((module) => module.id === item.target.id)!;
              this.applySource(item.voice, item.target, before, progress);
            }
            for (const target of plan.effects ?? []) {
              const effect = this.effects.get(target.id)!;
              const values = morphParameters(from.effects!.find((item) => item.id === target.id)!.parameters, target.parameters, progress, ['filterType']);
              if (effect.type === 'reverb') delete values.decay;
              effect.apply(values);
            }
            if (!snapshot.ignoredNodes?.includes('master')) this.rack.setParameter('gain', morphParameters(from.master, plan.master, progress).gain);
            if (progress >= 0.5 && !midpoint) {
              for (const item of prepared) item.piano?.commit();
              for (const target of plan.effects ?? []) if (target.type === 'reverb' && !parameterIsIgnored(snapshot, target.id, 'decay')) this.effects.get(target.id)!.transitionDecay(Number(target.parameters.decay), seconds / 2);
              midpoint = true;
            }
            onPhase('transition', progress);
            if (progress === 1) finish(); else timer = window.setTimeout(tick, 33);
          } catch (error) { window.clearTimeout(timer); transition.signal.removeEventListener('abort', canceled); reject(error); }
        };
        tick();
      });
      for (const { voice } of prepared) {
        signal.throwIfAborted();
        voice.engine.setMovement(movement); voice.enabled = true;
        if (this.playing && !voice.engine.isPlaying && (voice.type !== 'piano_sampler' || voice.engine.currentGestures.length)) {
          await voice.engine.start();
          if (!this.playing || signal.aborted) voice.engine.stop();
        }
      }
    } finally { signal.removeEventListener('abort', abort); if (this.transition === transition) this.transition = null; }
  }

  private applySource(voice: Voice, target: ModulePlan, before: ModuleSnapshot, progress: number): void {
    if (voice.type === 'granular' && target.type === 'granular' && before.type === 'granular') {
      const values = morphParameters(before.parameters, target.parameters, progress, ['filterType']);
      for (const key of Object.keys(values) as (keyof typeof values)[]) voice.engine.setParameter(key, values[key]);
    } else if (voice.type === 'physical' && target.type === 'physical' && before.type === 'physical') {
      const values = morphParameters(before.parameters, target.parameters, progress, ['rootNote', 'filterType']);
      for (const key of Object.keys(values) as (keyof typeof values)[]) voice.engine.setParameter(key, values[key]);
      if (progress >= 0.5 && JSON.stringify(voice.engine.currentSequence) !== JSON.stringify(target.sequence)) voice.engine.setSequence(target.sequence);
    } else if (voice.type === 'piano_sampler' && target.type === 'piano_sampler' && before.type === 'piano_sampler') {
      const values = morphParameters(before.parameters, target.parameters, progress);
      for (const key of Object.keys(values) as (keyof typeof values)[]) voice.engine.setParameter(key, values[key]);
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true; this.transportRevision++; this.transition?.abort();
    this.timer?.();
    for (const effect of this.effects.values()) effect.dispose();
    await this.rack.dispose();
  }
}
