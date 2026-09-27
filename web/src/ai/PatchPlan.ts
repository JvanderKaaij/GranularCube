import {
  physicalControlGroups,
  granularControlGroups,
  masterControlDefinitions,
  type PhysicalParameters,
  type MasterParameters,
  type Parameters,
} from '../parameters';
import { sampleCatalog } from '../sampleCatalog';
import { effectControls, isSourceEffectParameter, type EffectSnapshot } from '../audio/EffectNode';
import type { AudioConnection } from '../audio/AudioGraph';
import { effectRouting, parseEffects, type EffectPlan } from './EffectPlan';

export interface GranularSnapshot {
  id: number;
  type: 'granular';
  label: string;
  playing: boolean;
  sample: string;
  sampleDurationMs: number;
  parameters: Parameters;
}

export interface PhysicalSnapshot {
  id: number;
  type: 'physical';
  label: string;
  playing: boolean;
  parameters: PhysicalParameters;
  sequence: number[];
}

export type ModuleSnapshot = GranularSnapshot | PhysicalSnapshot;

export interface PatchSnapshot {
  master: MasterParameters;
  modules: ModuleSnapshot[];
  effects?: EffectSnapshot[];
  connections?: AudioConnection[];
}

export type ModulePlan =
  | { id: number; type: 'granular'; sample: string; parameters: Parameters }
  | { id: number; type: 'physical'; parameters: PhysicalParameters; sequence: number[] };

export interface PatchPlan {
  master: MasterParameters;
  modules: ModulePlan[];
  effects?: EffectPlan[];
}

const parameterMoodDescriptions: Record<string, string> = {
  density: 'Higher values make a denser, more continuous texture; lower values create sparse, exposed events.',
  lengthMin: 'Lower bound for grain duration; shorter grains sound crisp or fragmented, longer grains sustain and blur.',
  lengthMax: 'Upper bound for grain duration; longer grains sound smoother and more sustained, shorter grains more pointed.',
  ampMin: 'Quietest grain level; a higher floor makes the texture more even and present.',
  ampMax: 'Loudest grain level; a wider amplitude range creates more dynamic, shifting textures.',
  selectionStart: 'Beginning of the source region; moving it changes which moment or timbre is sampled.',
  selectionEnd: 'End of the source region; a narrow window emphasizes a small detail, a wide window gives more variation.',
  filterFreqMin: 'Low edge of randomized cutoff. Lower lowpass cutoffs darken the sound; lower highpass cutoffs retain more body. Bandpass/notch place the selected band.',
  filterFreqMax: 'High edge of randomized cutoff. Higher lowpass cutoffs retain brightness; higher highpass cutoffs thin the sound. Wider min/max spans give more grain-to-grain timbral variation.',
  filterQMin: 'Minimum filter resonance; higher values make the cutoff more pronounced or nasal.',
  filterQMax: 'Maximum filter resonance; higher values add sharper, more colored resonant moments.',
  filterType: 'Selects how the sound is shaped: low-pass darkens, high-pass thins, band-pass isolates a frequency region, and notch removes one. A gentle low-pass can soften a physical melodic line without losing its pitch.',
  reverbMix: 'Wet/dry balance; more wetness places the sound farther away and blends it into space.',
  reverbDecay: 'Reverb tail length; longer tails feel larger, more lingering, and more diffuse.',
  reverbShimmer: 'Octave-up reverb layer; more shimmer adds airy, luminous harmonic lift.',
  gain: 'Module loudness; use it to balance this voice against the others.',
  reverbMixMaster: 'Shared wet/dry balance; more wetness places the whole patch farther into a common space.',
  reverbDecayMaster: 'Shared reverb tail length; longer values make the complete patch feel larger and more lingering.',
  rootNote: 'Physical pitch center; lower notes feel weightier and darker, higher notes lighter and brighter.',
  rate: 'Physical sequence speed; faster strikes feel more active, slower strikes more spacious.',
  decay: 'Physical ring length; longer values sustain and feel more resonant.',
  softness: 'Mallet softness; softer strikes feel round and gentle, harder strikes sharper and more percussive.',
  strikePosition: 'Where the physical is excited; changes which partials speak and therefore its character.',
  noiseAmount: 'Noise in the attack; more adds breath, grit, or a noisy transient.',
  noiseColor: 'Noise brightness; higher values sound brighter and sharper.',
  noiseDecay: 'Noise attack duration; longer values make the noisy component linger.',
  inharmonicity: 'Moves partials away from harmonic tuning toward metallic/bell or percussive modal tuning; string mode keeps harmonic partials.',
  brightness: 'Strength of upper partials; higher values make the physical brighter and more cutting.',
  damping: 'Attenuation of upper modes; more damping softens high frequencies and shortens their presence.',
  beating: 'Detuning between paired modes; more beating adds wavering, shimmering motion.',
  body: 'Low body resonance; higher values add weight and a deeper resonant component.',
  spread: 'Stereo width; higher values distribute the physical more widely across the stereo field.',
  filterCutoff: 'Physical filter cutoff; lower low-pass values darken and tuck the instrument behind other parts, while higher values preserve its attack and harmonic detail. High-pass, band-pass, and notch use the selected cutoff in their respective mode.',
  filterResonance: 'Physical filter resonance; a modest peak emphasizes the cutoff for a more vocal or focused tone, while high resonance can ring and compete with the note.',
  delayMix: 'Independent stereo echo return. Bell and string melodies always retain at least 0.55 level; alternate left/right repeats remain present even with cloud reverb. Let echoes carry a sparse motif between new strikes.',
  delayTime: 'Spacing of successive left/right echoes. Bell/string uses 0.5–1.2 seconds; 0.7–0.9 seconds is a useful atmospheric starting point. Match the note gaps rather than flooding them with new notes.',
  delayFeedback: 'Level passed to the next alternating echo. Bell/string keeps at least 0.58 so several repeats linger and soften; percussion can use less. For a spacious melody, slow its pattern rather than removing its echo trail.',
  model: 'Bell emphasizes inharmonic metallic modes; Percussive body uses a short bright impact; Plucked string emphasizes harmonic partials and string-like decay.',
};

export function buildParameterContext(snapshot: PatchSnapshot): object {
  const modular = snapshot.effects !== undefined;
  const granular = granularControlGroups.flatMap((group) => group.controls.flatMap((control) => {
    const keys = control.kind === 'range' ? control.keys : [control.key];
    return keys.map((key) => ({
      key,
      min: control.min,
      max: control.kind === 'range' && control.keys[0] === 'selectionStart' ? 'selected sample duration; see perModuleWindows' : control.max,
      unit: control.unit?.trim() ?? 'unitless',
      step: control.step,
      moodEffect: parameterMoodDescriptions[key],
    }));
  }));
  const physicals = physicalControlGroups.flatMap((group) => group.controls.map((control) => ({
    key: control.key,
    min: control.min, max: control.max, unit: control.unit?.trim() ?? (control.key === 'rootNote' ? 'MIDI note' : 'unitless'),
    step: control.step,
    moodEffect: parameterMoodDescriptions[control.key],
  })));
  const master = masterControlDefinitions.map((control) => ({
    key: control.key,
    min: control.min, max: control.max, unit: control.unit?.trim() ?? 'unitless',
    step: control.step,
    moodEffect: parameterMoodDescriptions[`${control.key}Master`] ?? parameterMoodDescriptions[control.key],
  }));
  return {
    master: modular ? master.filter((control) => control.key === 'gain') : master,
    granular: modular ? granular.filter((control) => !isSourceEffectParameter(control.key)) : granular,
    granularDiscrete: modular ? [] : [{ key: 'filterType', allowed: ['lowpass', 'highpass', 'bandpass', 'notch'], moodEffect: parameterMoodDescriptions.filterType }],
    physical: modular ? physicals.filter((control) => !isSourceEffectParameter(control.key)) : physicals,
    physicalDiscrete: [
      { key: 'model', allowed: ['bell', 'percussion', 'string'], moodEffect: parameterMoodDescriptions.model },
      ...(!modular ? [{ key: 'filterType', allowed: ['lowpass', 'highpass', 'bandpass', 'notch'], moodEffect: parameterMoodDescriptions.filterType }] : []),
    ],
    effects: modular ? effectRouting(snapshot).map((effect) => ({ ...effect, controls: effectControls[effect.type], discrete: effect.type === 'filter' ? [{ key: 'filterType', allowed: ['lowpass', 'highpass', 'bandpass', 'notch'], moodEffect: parameterMoodDescriptions.filterType }] : effect.type === 'spectral' ? [{ key: 'freeze', allowed: [false, true], moodEffect: 'Captures and sustains the current spectral frame. Use for a held, evolving tone; release to return to live spectral input.' }] : [] })) : undefined,
    connections: snapshot.connections,
    perModuleWindows: snapshot.modules.flatMap((m) => m.type === 'granular' ? [{ id: m.id, currentSample: m.sample, min: 0, max: Math.ceil(m.sampleDurationMs), unit: 'ms', newSample: 'Set selectionStart=selectionEnd=0 until the new sample is decoded' }] : []),
    interpretation: 'Ranges are inclusive. For every parameter, choose a value inside its range and on its step. Min/max pairs must be ordered.',
  };
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${path} must be a JSON object`);
  return value as Record<string, unknown>;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number, step: number, path: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a number`);
  if (value < min || value > max) throw new Error(`${path} must be between ${min} and ${max}`);
  const rounded = min + Math.round((value - min) / step) * step;
  return Math.max(min, Math.min(max, Number(rounded.toFixed(4))));
}

function requireFields(raw: Record<string, unknown>, keys: string[], path: string): void {
  for (const key of keys) {
    if (raw[key] === undefined) throw new Error(`${path}.${key} is required`);
  }
}

function parseMaster(value: unknown, current: MasterParameters, modular = false): MasterParameters {
  const raw = record(value, 'master');
  requireFields(raw, modular ? ['gain'] : ['reverbMix', 'reverbDecay'], 'master');
  const result = { ...current };
  for (const control of masterControlDefinitions) {
    result[control.key] = numberInRange(raw[control.key], current[control.key], control.min, control.max, control.step, `master.${control.key}`);
  }
  return result;
}

function parseGranular(value: unknown, current: GranularSnapshot, selectedSample: string, modular = false): Parameters {
  const raw = record(value, `${current.label}.parameters`);
  if (!modular) requireFields(raw, ['reverbMix', 'reverbDecay', 'reverbShimmer'], `${current.label}.parameters`);
  const result = { ...current.parameters };
  for (const group of granularControlGroups) {
    for (const control of group.controls) {
      const max = control.kind === 'range' && control.keys[0] === 'selectionStart'
        ? selectedSample === current.sample ? Math.max(0, Math.ceil(current.sampleDurationMs)) : 3_600_000
        : control.max;
      const keys = control.kind === 'range' ? control.keys : [control.key];
      for (const key of keys) {
        result[key] = numberInRange(raw[key], current.parameters[key], control.min, max, control.step, `${current.label}.${key}`);
      }
    }
  }
  if (raw.filterType !== undefined) {
    if (!['lowpass', 'highpass', 'bandpass', 'notch'].includes(String(raw.filterType))) throw new Error(`${current.label}.filterType is invalid`);
    result.filterType = raw.filterType as Parameters['filterType'];
  }
  for (const [lower, upper] of [
    ['lengthMin', 'lengthMax'], ['ampMin', 'ampMax'], ['selectionStart', 'selectionEnd'],
    ['filterFreqMin', 'filterFreqMax'], ['filterQMin', 'filterQMax'],
  ] as const) {
    if (result[lower] > result[upper]) throw new Error(`${current.label}: ${lower} exceeds ${upper}`);
  }
  return result;
}

function parsePhysical(value: unknown, current: PhysicalSnapshot, modular = false): PhysicalParameters {
  const raw = record(value, `${current.label}.parameters`);
  requireFields(raw, ['model', ...(!modular ? ['filterType'] : []), ...physicalControlGroups.flatMap((group) => group.controls.map((control) => control.key)).filter((key) => !modular || !isSourceEffectParameter(key))], `${current.label}.parameters`);
  const result = { ...current.parameters };
  if (!['bell', 'percussion', 'string'].includes(String(raw.model))) throw new Error(`${current.label}.model must be bell, percussion, or string`);
  result.model = raw.model as PhysicalParameters['model'];
  if (!modular || raw.filterType !== undefined) {
    if (!['lowpass', 'highpass', 'bandpass', 'notch'].includes(String(raw.filterType))) throw new Error(`${current.label}.filterType must be lowpass, highpass, bandpass, or notch`);
    result.filterType = raw.filterType as PhysicalParameters['filterType'];
  }
  for (const group of physicalControlGroups) {
    for (const control of group.controls) {
      result[control.key] = numberInRange(raw[control.key], current.parameters[control.key], control.min, control.max, control.step, `${current.label}.${control.key}`);
    }
  }
  return result;
}

export function parsePhysicalSequence(value: unknown, rootNote: number, label: string): number[] {
  if (!Array.isArray(value) || value.length < 4 || value.length > 16) {
    throw new Error(`${label}.sequence must contain 4–16 note offsets`);
  }
  for (const offset of value) {
    if (!Number.isInteger(offset) || offset < -12 || offset > 24 || rootNote + offset < 48 || rootNote + offset > 96) {
      throw new Error(`${label}.sequence contains an invalid note offset`);
    }
  }
  return [...value] as number[];
}

export function parsePatchPlan(responseText: string, snapshot: PatchSnapshot): PatchPlan {
  const text = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('API response is not valid JSON'); }
  const root = record(parsed, 'response');
  if (!Array.isArray(root.modules)) throw new Error('response.modules must be an array');
  if (root.modules.length !== snapshot.modules.length) throw new Error('API response must include every current module exactly once');

  const modular = snapshot.effects !== undefined;
  const master = parseMaster(root.master, snapshot.master, modular);
  const byId = new Map<number, Record<string, unknown>>();
  for (const item of root.modules) {
    const module = record(item, 'module');
    if (typeof module.id !== 'number' || byId.has(module.id)) throw new Error('API response has a missing or duplicate module ID');
    byId.set(module.id, module);
  }
  const modules: ModulePlan[] = snapshot.modules.map((current) => {
    const module = byId.get(current.id);
    if (!module || module.type !== current.type) throw new Error(`API response does not match ${current.label}`);
    if (current.type === 'granular') {
      if (typeof module.sample !== 'string' ||
        (module.sample !== current.sample && !sampleCatalog.some(({ file }) => file === module.sample))) {
        throw new Error(`${current.label}.sample must be an available sample filename`);
      }
      return { id: current.id, type: 'granular', sample: module.sample, parameters: parseGranular(module.parameters, current, module.sample, modular) };
    }
    const parameters = parsePhysical(module.parameters, current, modular);
    return { id: current.id, type: 'physical', parameters, sequence: parsePhysicalSequence(module.sequence, parameters.rootNote, current.label) };
  });
  return { master, modules, ...(modular ? { effects: parseEffects(root.effects, snapshot) } : {}) };
}
