import { AtmosphericDelay } from './AtmosphericDelay';
import { CloudReverb } from './CloudReverb';
import { parameterLfoValue, type ParameterLfoMap } from './ParameterLfo';

export type EffectKind = 'filter' | 'delay' | 'reverb' | 'spectral';
export type EffectValues = Record<string, number | string | boolean>;
export interface EffectSnapshot { id: string; type: EffectKind; parameters: EffectValues; bypass: boolean }
export interface EffectControl { key: string; label: string; min: number; max: number; step: number; unit?: string; moodEffect: string }
export const effectControls: Record<EffectKind, EffectControl[]> = {
  filter: [
    { key: 'cutoff', label: 'Cutoff', min: 20, max: 20000, step: 1, unit: 'Hz', moodEffect: 'Low-pass darkens as cutoff falls; high-pass thins as cutoff rises. Band-pass focuses a band and notch removes one.' },
    { key: 'resonance', label: 'Resonance', min: 0.1, max: 12, step: 0.1, moodEffect: 'Emphasizes the cutoff. Modest resonance keeps atmospheric layers smooth.' },
  ],
  delay: [
    { key: 'mix', label: 'Echo level', min: 0, max: 0.8, step: 0.01, moodEffect: 'Level of alternating stereo echoes alongside the direct sound. A melodic atmosphere benefits from 0.55–0.7.' },
    { key: 'time', label: 'Echo spacing', min: 0.05, max: 1.5, step: 0.01, unit: 's', moodEffect: 'Time between alternating echoes. Longer spacing leaves room around sparse notes.' },
    { key: 'feedback', label: 'Repeat amount', min: 0, max: 0.78, step: 0.01, moodEffect: 'Persistence of repeats; 0.58–0.7 provides a lingering melodic trail.' },
  ],
  reverb: [
    { key: 'mix', label: 'Wet / dry', min: 0, max: 1, step: 0.01, moodEffect: 'Places the incoming signal in a diffuse space. Moderate values retain sample detail and delay attacks.' },
    { key: 'decay', label: 'Tail', min: 1, max: 12, step: 0.1, unit: 's', moodEffect: 'Tail length; longer tails sustain the space between events.' },
  ],
  spectral: [
    { key: 'mix', label: 'Wet / dry', min: 0, max: 1, step: 0.01, moodEffect: 'Balance between the original signal and the spectral resynthesis.' },
    { key: 'pitch', label: 'Spectral shift', min: -12, max: 12, step: 0.1, unit: 'st', moodEffect: 'Moves spectral partials by semitones while retaining the evolving phase structure.' },
    { key: 'smear', label: 'Spectral smear', min: 0, max: 1, step: 0.01, moodEffect: 'Blends recent spectral energy into a soft, lingering texture.' },
  ],
};
export const effectDefaults: Record<EffectKind, EffectValues> = {
  filter: { filterType: 'lowpass', cutoff: 12000, resonance: 0.7 },
  delay: { mix: 0.62, time: 0.75, feedback: 0.65 },
  reverb: { mix: 0.28, decay: 4 },
  spectral: { mix: 0.35, pitch: 0, smear: 0.25, freeze: false },
};

const workletLoads = new WeakMap<AudioContext, Promise<void>>();
function loadPhaseVocoder(context: AudioContext): Promise<void> {
  let pending = workletLoads.get(context);
  if (!pending) {
    pending = context.audioWorklet.addModule(new URL('phase-vocoder-processor.js', document.baseURI).href);
    workletLoads.set(context, pending);
  }
  return pending;
}
export const isSourceEffectParameter = (key: string): boolean => /^(filter|reverb|delay)/.test(key);

/** Reusable stereo insert, independent of its source and all external routing. */
export class EffectNode {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly bypassPath: GainNode;
  private readonly send: GainNode;
  private readonly processed: GainNode;
  private filter?: BiquadFilterNode;
  private delay?: AtmosphericDelay;
  private reverb?: CloudReverb;
  private spectral?: AudioWorkletNode;
  private spectralStatus = '';
  private disposed = false;
  private values: EffectValues;
  private bypassed = false;
  private decayTimer?: ReturnType<typeof setTimeout>;
  private lfos: ParameterLfoMap = {};
  private lastDecayLfoAt = -Infinity;
  constructor(private context: AudioContext, readonly type: EffectKind) {
    this.values = { ...effectDefaults[type] };
    this.input = context.createGain(); this.output = context.createGain();
    this.bypassPath = context.createGain(); this.send = context.createGain(); this.processed = context.createGain();
    this.bypassPath.gain.value = 0;
    this.input.connect(this.bypassPath).connect(this.output);
    this.input.connect(this.send); this.processed.connect(this.output);
    if (type === 'filter') {
      this.filter = context.createBiquadFilter(); this.filter.type = 'lowpass';
      this.send.connect(this.filter).connect(this.processed);
    } else if (type === 'delay') {
      this.send.connect(this.processed);
      this.delay = new AtmosphericDelay(context, this.processed, { mix: Number(this.values.mix), time: Number(this.values.time), feedback: Number(this.values.feedback) });
      this.send.connect(this.delay.input);
    } else if (type === 'reverb') {
      this.reverb = new CloudReverb(context, this.processed, Number(this.values.mix), Number(this.values.decay), 0);
      this.send.connect(this.reverb.input);
    } else {
      // Keep a clean passthrough until the worklet is ready or if the browser cannot load it.
      this.send.connect(this.processed);
      this.spectralStatus = 'Loading phase vocoder…';
      void this.initializeSpectral();
    }
    this.apply(this.values);
  }
  get parameters(): EffectValues { return { ...this.values }; }
  get bypass(): boolean { return this.bypassed; }
  get status(): string { return this.spectralStatus; }
  setBypass(bypass: boolean): void {
    this.bypassed = bypass;
    const now = this.context.currentTime;
    this.bypassPath.gain.setTargetAtTime(bypass ? 1 : 0, now, 0.02);
    this.send.gain.setTargetAtTime(bypass ? 0 : 1, now, 0.02);
    this.processed.gain.setTargetAtTime(bypass ? 0 : 1, now, 0.02);
  }
  set(key: string, value: number | string | boolean): void {
    if (this.type === 'spectral' && key === 'freeze' && typeof value === 'boolean') {
      this.values[key] = value; this.spectral?.port.postMessage({ freeze: value }); return;
    }
    if (key === 'filterType' && this.filter) {
      if (!['lowpass', 'highpass', 'bandpass', 'notch'].includes(String(value))) throw new Error('Invalid filter mode');
      this.values[key] = value; this.filter.type = value as BiquadFilterType; return;
    }
    const control = effectControls[this.type].find((item) => item.key === key);
    if (!control || typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid effect parameter');
    const next = Math.max(control.min, Math.min(control.max, value));
    const changed = this.values[key] !== next;
    this.values[key] = next;
    const now = this.context.currentTime;
    if (this.filter) (key === 'cutoff' ? this.filter.frequency : this.filter.Q).setTargetAtTime(next, now, 0.025);
    if (this.spectral && ['mix', 'pitch', 'smear'].includes(key)) (this.spectral.parameters as unknown as { get(name: string): AudioParam }).get(key).setTargetAtTime(next, now, 0.05);
    if (this.delay) {
      if (key === 'mix') this.delay.setMix(next);
      if (key === 'time') this.delay.setTime(next);
      if (key === 'feedback') this.delay.setFeedback(next);
    }
    if (this.reverb) {
      if (key === 'mix') this.reverb.setMix(next);
      if (key === 'decay' && changed) {
        clearTimeout(this.decayTimer);
        this.decayTimer = setTimeout(() => this.reverb?.setDecay(next), 180);
      }
    }
  }
  apply(values: EffectValues): void { for (const [key, value] of Object.entries(values)) this.set(key, value); }
  private async initializeSpectral(): Promise<void> {
    try {
      if (!this.context.audioWorklet) throw new Error('AudioWorklet is not available');
      await loadPhaseVocoder(this.context);
      if (this.disposed) return;
      const node = new AudioWorkletNode(this.context, 'phase-vocoder', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
      this.send.disconnect(this.processed);
      this.send.connect(node).connect(this.processed);
      this.spectral = node;
      const workletParameters = node.parameters as unknown as { get(name: string): AudioParam };
      for (const key of ['mix', 'pitch', 'smear']) workletParameters.get(key).setValueAtTime(Number(this.values[key]), this.context.currentTime);
      node.port.postMessage({ freeze: Boolean(this.values.freeze) });
      this.spectralStatus = 'Phase vocoder ready';
    } catch (error) {
      this.spectralStatus = `Spectral processor unavailable: ${error instanceof Error ? error.message : 'unknown error'}`;
    }
  }
  setParameterLfos(settings: ParameterLfoMap): void { this.lfos = structuredClone(settings); }
  applyParameterLfos(timeSeconds: number): void {
    for (const control of effectControls[this.type]) {
      if (!this.lfos[control.key]?.enabled) continue;
      if (control.key === 'decay' && timeSeconds - this.lastDecayLfoAt < 30) continue;
      const base = Number(this.values[control.key]);
      const value = parameterLfoValue(base, control.key, this.lfos[control.key], timeSeconds, control.min, control.max);
      if (value === base) continue;
      const restore = this.values[control.key];
      this.set(control.key, value);
      this.values[control.key] = restore;
      if (control.key === 'decay') this.lastDecayLfoAt = timeSeconds;
    }
  }
  transitionDecay(value: number, seconds: number): void {
    if (!this.reverb) return;
    clearTimeout(this.decayTimer); this.values.decay = value;
    this.reverb.setDecay(value, seconds);
  }
  dispose(): void {
    this.disposed = true;
    clearTimeout(this.decayTimer); this.delay?.dispose(); this.reverb?.dispose(); this.spectral?.disconnect(); this.filter?.disconnect();
    for (const node of [this.input, this.output, this.bypassPath, this.send, this.processed]) node.disconnect();
  }
}
