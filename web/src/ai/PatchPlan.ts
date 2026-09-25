import {
  bellControlGroups,
  granularControlGroups,
  masterControlDefinitions,
  type BellParameters,
  type MasterParameters,
  type Parameters,
} from '../parameters';
import { sampleCatalog } from '../sampleCatalog';

export interface GranularSnapshot {
  id: number;
  type: 'granular';
  label: string;
  playing: boolean;
  sample: string;
  sampleDurationMs: number;
  parameters: Parameters;
}

export interface BellSnapshot {
  id: number;
  type: 'bell';
  label: string;
  playing: boolean;
  parameters: BellParameters;
  sequence: number[];
}

export type ModuleSnapshot = GranularSnapshot | BellSnapshot;

export interface PatchSnapshot {
  master: MasterParameters;
  modules: ModuleSnapshot[];
}

export type ModulePlan =
  | { id: number; type: 'granular'; sample: string; parameters: Parameters }
  | { id: number; type: 'bell'; parameters: BellParameters; sequence: number[] };

export interface PatchPlan {
  master: MasterParameters;
  modules: ModulePlan[];
}

export interface ImagePatchPlan {
  description: string;
  mood: string;
  composition: string;
  plan: PatchPlan;
  sfxKeywords: Map<number, string>;
  roles: Map<number, string>;
  sources: Map<number, 'sfx' | 'built_in'>;
}

export const PATCH_SYSTEM_PROMPT = `You are a careful sound designer controlling a live browser audio patch. Turn the user's mood into coherent synthesizer settings that express that mood. Reply with exactly one JSON object matching the example in the user message: {"master":{...},"modules":[{"id":1,"type":"granular","sample":"violin.wav","parameters":{...}}]}. No prose, Markdown, code fences, new modules, or playback changes. Keep every existing module ID and type and provide a parameters object for each. Include every parameter key, using JSON numbers (not strings). For every granular module include a sample filename chosen from the available samples in the user message; you may keep its current sample. Match filenames exactly. Choose samples that suit the mood. Explicitly set the master reverb mix and decay and every module's reverb mix and decay; granular modules also need reverb shimmer. Shape these effects for the mood along with the synth settings. Stay within these bounds:
Master: reverbMix 0–1; reverbDecay 0.5–6 seconds; gain 0–1.5.
Granular: density 0.1–60; lengthMin/lengthMax 5–2000 ms; ampMin/ampMax 0–1; selectionStart/selectionEnd are milliseconds within the selected sample; filterFreqMin/filterFreqMax 20–20000 Hz; filterQMin/filterQMax 0.1–10; filterType one of lowpass, highpass, bandpass, notch; reverbMix 0–1; reverbDecay 1–12 seconds; reverbShimmer 0–1; gain 0–1. If choosing a different sample, set selectionStart=0 and selectionEnd=0 to use its full duration; the patch will fill this in after loading.
Bell: rootNote integer MIDI 48–84; rate 0.2–3 strikes/second; decay 0.5–10 seconds; softness, noiseAmount, noiseColor, inharmonicity, brightness, damping, beating, body, and spread each 0–1; strikePosition 0.05–0.95; noiseDecay 0.02–0.8 seconds; reverbMix 0–1; reverbDecay 1–12 seconds; gain 0–1. The bell is a struck modal resonator: softness controls the mallet; noiseAmount/noiseColor/noiseDecay create an audible noisy attack or texture; strikePosition changes which modes are excited; inharmonicity moves between harmonic and bell-like partials; brightness raises high partials; damping shortens their ring; beating detunes paired modes; body adds a lower resonance. Choose these values deliberately for the mood. For each bell module, also include a sequence array of 4–16 integer semitone offsets from its rootNote, played in order (for example [0,7,12,4,9,2,7,14]). Each offset must be -12–24 and rootNote + offset must be MIDI 48–96. Compose the sequence to suit the mood. Do not add sequence to granular modules.
For every Min/Max pair, Min must be no greater than Max. Use modest output levels and avoid abrupt loud jumps. Preserve whether each module is playing. Most granular samples lack verified pitch; do not claim exact note matching with the bell.`;

export function buildMoodPrompt(mood: string, snapshot: PatchSnapshot): string {
  const example: PatchPlan = {
    master: snapshot.master,
    modules: snapshot.modules.map((module) => module.type === 'bell'
      ? { id: module.id, type: 'bell', parameters: module.parameters, sequence: module.sequence }
      : { id: module.id, type: 'granular', sample: module.sample, parameters: module.parameters }),
  };
  return `Mood: ${mood.trim()}\n\nAvailable built-in samples (choose the exact file value for each granular module):\n${JSON.stringify(sampleCatalog, null, 2)}\n\nCurrent patch settings and sample context:\n${JSON.stringify(snapshot, null, 2)}\n\nExample of the required response format (replace values to suit the mood; retain IDs, types, and parameter keys, choose samples, and compose a bell sequence when present):\n${JSON.stringify(example, null, 2)}`;
}

export const IMAGE_PATCH_SYSTEM_PROMPT = `${PATCH_SYSTEM_PROMPT}\nFor an image request, also return top-level \"description\" (one factual sentence about visible content), \"mood\" (concise musical intention), and \"composition\" (one or two sentences explaining how the layers relate). Give EVERY module a short \"role\" (such as recognizable scene sound, sustained pad, rhythmic pulse, lead, percussion, or bell accents). Every granular module also needs \"source\": either \"sfx\" or \"built_in\". Choose EXACTLY ONE granular module with source \"sfx\" and give it a short \"sfx_keyword\" describing an audible object or plausible action in the image. It generates one recognizable sound effect. Its sample field should remain its current filename as a placeholder, and selectionStart=0 and selectionEnd=0. ALL other granular modules must have source \"built_in\" and choose exact filenames from the available built-in sample catalog; do not give them an sfx_keyword. You can turn an existing sustained sample into a pad with longer overlapping grains, or an existing transient/instrument sample into a lead or percussive line with shorter, sparser grains. Aim for distinct complementary roles; use a built-in pad and a built-in lead or rhythmic/percussive part when enough granular modules exist. If choosing a different built-in sample, set selectionStart=0 and selectionEnd=0. Use any bell modules as complementary struck notes or accents and compose their sequences. Make the synth's rhythm, density, timbre, filter, notes, and all module and master FX support the scene sound so the music and SFX feel connected to the events and atmosphere in the image. Prioritize visible sound sources over generic mood words. Do not invent motion or sound that the still image does not support. The application starts all image-composition modules after applying the patch, so set levels suitable for simultaneous playback.`;

export function buildImagePatchPrompt(direction: string, snapshot: PatchSnapshot): string {
  const firstGranularId = snapshot.modules.find((module) => module.type === 'granular')?.id;
  let builtInExampleIndex = 0;
  const exampleModules = snapshot.modules.map((module) => {
    if (module.type === 'bell') {
      return { id: module.id, type: 'bell', role: 'sparse melodic accents', parameters: module.parameters, sequence: module.sequence };
    }
    if (module.id === firstGranularId) {
      return { id: module.id, type: 'granular', role: 'recognizable scene sound', source: 'sfx', sample: module.sample, sfx_keyword: 'visible sound source', parameters: { ...module.parameters, selectionStart: 0, selectionEnd: 0 } };
    }
    const isPad = builtInExampleIndex++ % 2 === 0;
    return {
      id: module.id, type: 'granular', role: isPad ? 'sustained pad' : 'sparse percussion',
      source: 'built_in', sample: isPad ? 'choir_children.wav' : 'egg_shaker.wav',
      parameters: {
        ...module.parameters,
        density: isPad ? 12 : 2.5,
        lengthMin: isPad ? 380 : 35,
        lengthMax: isPad ? 800 : 90,
        ampMin: isPad ? 0.1 : 0.2,
        ampMax: isPad ? 0.3 : 0.45,
        selectionStart: 0, selectionEnd: 0,
        reverbMix: isPad ? 0.5 : 0.2,
        gain: isPad ? 0.16 : 0.12,
      },
    };
  });
  const example = {
    description: 'A concise description of the visible scene and likely sound sources.',
    mood: 'A short musical intention drawn from the image.',
    composition: 'The recognizable scene sound sits above a soft built-in sample pad and a sparse built-in rhythmic or lead layer; bell strikes add accents if available.',
    master: snapshot.master,
    modules: exampleModules,
  };
  const roster = snapshot.modules.map((module) => ({
    id: module.id,
    instrument: module.type,
    playing: module.playing,
    ...(module.type === 'granular' ? { currentSample: module.sample } : { currentSequence: module.sequence }),
  }));
  return `Direction: ${direction.trim() || 'Translate the visible scene into a connected soundscape.'}\n\nCompose for the instruments actually present in the patch. Granular modules can play sustained pads with overlapping grains or rhythmic, lead, and percussive parts with shorter, separated grains. Choir and sustained instruments are candidates for pads; shaker and drums for percussion; clarinet, flute, piano, and other instrument samples for lead gestures. A bell module, when present, plays a sequence of struck physical-modeling notes. Use the catalog's note metadata only where it is given; other sample pitches are unknown. Make one generated SFX recognizable and relevant to something visible, then connect the musical layers to that sound and to one another. The layer roles should be audible in the chosen sample, density, grain length, filter, level, and FX settings.\n\nInstruments to compose for (keep these IDs and types):\n${JSON.stringify(roster, null, 2)}\n\nAvailable built-in samples (choose exact file values for every built_in granular source):\n${JSON.stringify(sampleCatalog, null, 2)}\n\nCurrent patch settings and sample context:\n${JSON.stringify(snapshot, null, 2)}\n\nRequired response example (replace the description, mood, composition, roles, sources, sample choices, settings, and bell sequences to fit the image; retain IDs and types):\n${JSON.stringify(example, null, 2)}`;
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

function parseMaster(value: unknown, current: MasterParameters): MasterParameters {
  const raw = record(value, 'master');
  requireFields(raw, ['reverbMix', 'reverbDecay'], 'master');
  const result = { ...current };
  for (const control of masterControlDefinitions) {
    result[control.key] = numberInRange(raw[control.key], current[control.key], control.min, control.max, control.step, `master.${control.key}`);
  }
  return result;
}

function parseGranular(value: unknown, current: GranularSnapshot, selectedSample: string): Parameters {
  const raw = record(value, `${current.label}.parameters`);
  requireFields(raw, ['reverbMix', 'reverbDecay', 'reverbShimmer'], `${current.label}.parameters`);
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

function parseBell(value: unknown, current: BellSnapshot): BellParameters {
  const raw = record(value, `${current.label}.parameters`);
  requireFields(raw, bellControlGroups.flatMap((group) => group.controls.map((control) => control.key)), `${current.label}.parameters`);
  const result = { ...current.parameters };
  for (const group of bellControlGroups) {
    for (const control of group.controls) {
      result[control.key] = numberInRange(raw[control.key], current.parameters[control.key], control.min, control.max, control.step, `${current.label}.${control.key}`);
    }
  }
  return result;
}

function parseBellSequence(value: unknown, rootNote: number, label: string): number[] {
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

  const master = parseMaster(root.master, snapshot.master);
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
      return { id: current.id, type: 'granular', sample: module.sample, parameters: parseGranular(module.parameters, current, module.sample) };
    }
    const parameters = parseBell(module.parameters, current);
    return { id: current.id, type: 'bell', parameters, sequence: parseBellSequence(module.sequence, parameters.rootNote, current.label) };
  });
  return { master, modules };
}

export function parseImagePatchPlan(responseText: string, snapshot: PatchSnapshot): ImagePatchPlan {
  const text = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Image API response is not valid JSON'); }
  const root = record(parsed, 'image response');
  if (typeof root.description !== 'string' || !root.description.trim() || root.description.length > 600) {
    throw new Error('Image response needs a short scene description');
  }
  if (typeof root.mood !== 'string' || !root.mood.trim() || root.mood.length > 300) {
    throw new Error('Image response needs a short musical mood');
  }
  if (typeof root.composition !== 'string' || !root.composition.trim() || root.composition.length > 500) {
    throw new Error('Image response needs a short composition description');
  }
  const plan = parsePatchPlan(text, snapshot);
  const modules = root.modules as unknown[];
  const sfxKeywords = new Map<number, string>();
  const roles = new Map<number, string>();
  const sources = new Map<number, 'sfx' | 'built_in'>();
  for (const module of modules) {
    const entry = record(module, 'image module');
    if (typeof entry.role !== 'string' || !entry.role.trim() || entry.role.length > 100) {
      throw new Error(`Module ${entry.id}: role must be a short musical purpose`);
    }
    roles.set(entry.id as number, entry.role.trim());
    if (entry.type !== 'granular') continue;
    if (entry.source !== 'sfx' && entry.source !== 'built_in') {
      throw new Error(`GRAIN ${entry.id}: source must be sfx or built_in`);
    }
    sources.set(entry.id as number, entry.source);
    if (entry.source === 'sfx') {
      if (typeof entry.sfx_keyword !== 'string' || !entry.sfx_keyword.trim() || entry.sfx_keyword.length > 80) {
        throw new Error(`GRAIN ${entry.id}: sfx_keyword must be a short sound phrase`);
      }
      const current = snapshot.modules.find((item) => item.id === entry.id);
      if (current?.type !== 'granular' || entry.sample !== current.sample) throw new Error(`GRAIN ${entry.id}: sfx source must keep its current sample placeholder`);
      const settings = plan.modules.find((item) => item.id === entry.id);
      if (settings?.type !== 'granular' || settings.parameters.selectionStart !== 0 || settings.parameters.selectionEnd !== 0) {
        throw new Error(`GRAIN ${entry.id}: sfx source must use the full new sample (selectionStart=0, selectionEnd=0)`);
      }
      sfxKeywords.set(entry.id as number, entry.sfx_keyword.trim());
    } else if (!sampleCatalog.some(({ file }) => file === entry.sample)) {
      throw new Error(`GRAIN ${entry.id}: built_in source needs an available sample filename`);
    }
  }
  if (sfxKeywords.size !== 1) throw new Error('Image response must choose exactly one generated SFX layer');
  return { description: root.description.trim(), mood: root.mood.trim(), composition: root.composition.trim(), plan, sfxKeywords, roles, sources };
}
