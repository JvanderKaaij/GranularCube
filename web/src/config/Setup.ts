import { granularControlGroups, physicalControlGroups, granularSourceGroups, physicalSourceGroups, masterControlDefinitions, type MasterParameters, type Parameters, type PhysicalParameters } from '../parameters';
import { effectControls, type EffectSnapshot } from '../audio/EffectNode';
import type { ParameterLfoMap } from '../audio/ParameterLfo';
import { isOpenAIModel, type ModelSelection } from '../ai/OpenAIModels';
import type { MoodSettings } from '../ai/MoodController';
import type { NodeLayout } from '../ui/PatchEditor';
import type { Movement } from '../audio/AmbientMotion';
import { pianoControls, parsePianoGestures, validatePianoBank, type PianoBank, type PianoGesture, type PianoParameters } from '../audio/PianoProgram';

export interface SampleReference { kind: 'builtin' | 'asset'; name: string; filename?: string; audioBase64?: string }
export type SetupModule = { id: number; playing: boolean; movement?: Movement | null } & (
  { type: 'granular'; parameters: Parameters; sample: SampleReference } |
  { type: 'physical'; parameters: PhysicalParameters; sequence: number[] } |
  { type: 'piano_sampler'; parameters: PianoParameters; bank: PianoBank; gestures: PianoGesture[] }
);
export interface PatchSetup {
  version: 1;
  models: ModelSelection;
  mood: MoodSettings;
  master: MasterParameters;
  modules: SetupModule[];
  effects: EffectSnapshot[];
  connections: { from: string; to: string }[];
  layout: Record<string, NodeLayout>;
  lfos: Record<string, ParameterLfoMap>;
}
export interface SetupSummary { id: string; name: string; createdAt: string; updatedAt: string }
export interface StoredSetup extends SetupSummary { setup: PatchSetup }

/** Preserve older saved experiments after shortening the piano's permitted pauses. */
export function migratePianoPauses(value: PatchSetup): PatchSetup {
  if (!value || value.version !== 1 || !Array.isArray(value.modules)) return value;
  return { ...value, modules: value.modules.map((source) => {
    if (source?.type !== 'piano_sampler' || !source.parameters) return source;
    const { gapMinSeconds: min, gapMaxSeconds: max } = source.parameters;
    // Only migrate ordered values permitted by the previous controls. Invalid data still fails validation.
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 8 || min > 180 || max < 8 || max > 240 || min > max) return source;
    const shortest = pianoControls.find((control) => control.key === 'gapMinSeconds')!;
    const longest = pianoControls.find((control) => control.key === 'gapMaxSeconds')!;
    return { ...source, parameters: { ...source.parameters,
      gapMinSeconds: Math.max(shortest.min, Math.min(shortest.max, min)),
      gapMaxSeconds: Math.max(longest.min, Math.min(longest.max, max)) } };
  }) };
}

/** Check everything before preparing or replacing the current playing patch. */
export function validateSetup(value: PatchSetup): void {
  const fail = (message: string): never => { throw new Error(`Invalid setup: ${message}`); };
  const number = (v: unknown, min: number, max: number, field: string) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(field);
  };
  if (!value || value.version !== 1 || !Array.isArray(value.modules) || !Array.isArray(value.effects) || !Array.isArray(value.connections)) fail('unsupported format');
  if (value.modules.length > 64 || value.effects.length > 128 || value.connections.length > 512) fail('patch is too large');
  if (!value.models || !isOpenAIModel(value.models.text) || !isOpenAIModel(value.models.image)) fail('unsupported model selection');
  if (!value.mood || typeof value.mood.intention !== 'string' || typeof value.mood.evolutionEnabled !== 'boolean') fail('mood settings');
  number(value.mood.transitionSeconds, 0.2, 30, 'transition time');
  for (const key of ['briefSystem', 'parameterSystem', 'sfxTemplate'] as const) if (typeof value.mood.prompts?.[key] !== 'string' || !value.mood.prompts[key].trim()) fail('prompt settings');
  for (const control of masterControlDefinitions) number(value.master?.[control.key], control.min, control.max, `master.${control.key}`);
  const nodes = new Set(['master']);
  const lfoKeys = new Map<string, string[]>([['master', ['gain']]]);
  const lockKeys = new Map<string, string[]>([['master', ['gain']]]);
  for (const source of value.modules) {
    if (!Number.isInteger(source.id) || source.id < 1 || source.id > 1_000_000 || nodes.has(`source:${source.id}`)) fail('source ID');
    nodes.add(`source:${source.id}`);
    if (typeof source.playing !== 'boolean') fail('playback state');
    if (source.movement != null) {
      number(source.movement.amount, 0, 1, 'evolution amount');
      number(source.movement.periodSeconds, 20, 180, 'evolution period');
    }
    if (source.type === 'granular') {
      for (const group of granularControlGroups) for (const control of group.controls) for (const key of control.kind === 'range' ? control.keys : [control.key]) {
        number(source.parameters?.[key], control.min, key === 'selectionStart' || key === 'selectionEnd' ? Infinity : control.max, `source:${source.id}.${key}`);
      }
      for (const group of granularControlGroups) for (const control of group.controls) if (control.kind === 'range' && source.parameters[control.keys[0]] > source.parameters[control.keys[1]]) fail(`${source.id}: reversed parameter range`);
      if (!['lowpass', 'highpass', 'bandpass', 'notch'].includes(source.parameters.filterType)) fail('granular filter mode');
      if (!source.sample || !['builtin', 'asset'].includes(source.sample.kind) || !source.sample.name) fail('sample reference');
      if (source.sample.kind === 'builtin' && !/^[\w.-]+\.(wav|aif|aiff|mp3|m4a|ogg)$/i.test(source.sample.filename ?? '')) fail('sample filename');
      if (source.sample.kind === 'asset' && !source.sample.audioBase64 && !/^[a-f0-9]{64}\.wav$/.test(source.sample.filename ?? '')) fail('sample asset');
      lfoKeys.set(`source:${source.id}`, granularSourceGroups.flatMap((group) => group.controls.flatMap((control) => control.kind === 'range' ? [...control.keys] : [control.key])));
    } else if (source.type === 'physical') {
      for (const group of physicalControlGroups) for (const control of group.controls) number(source.parameters?.[control.key], control.min, control.max, `source:${source.id}.${control.key}`);
      if (!['bell', 'percussion', 'string'].includes(source.parameters.model) || !['lowpass', 'highpass', 'bandpass', 'notch'].includes(source.parameters.filterType)) fail('physical mode');
      if (!Array.isArray(source.sequence) || source.sequence.length < 1 || source.sequence.length > 64 || source.sequence.some((note) => !Number.isInteger(note) || source.parameters.rootNote + note < 0 || source.parameters.rootNote + note > 127)) fail('physical sequence');
      lfoKeys.set(`source:${source.id}`, physicalSourceGroups.flatMap((group) => group.controls.map((control) => control.key)));
    } else if (source.type === 'piano_sampler') {
      validatePianoBank(source.bank);
      parsePianoGestures(source.gestures, source.bank.samples.map((sample) => sample.midi), `Piano ${source.id}`);
      for (const control of pianoControls) number(source.parameters?.[control.key], control.min, control.max, `piano:${source.id}.${control.key}`);
      if (source.parameters.gapMinSeconds > source.parameters.gapMaxSeconds) fail('piano pause bounds');
      lfoKeys.set(`source:${source.id}`, pianoControls.map((control) => control.key));
    } else fail('source type');
    lockKeys.set(`source:${source.id}`, [...lfoKeys.get(`source:${source.id}`)!, ...(source.type === 'granular' ? ['sample'] : source.type === 'physical' ? ['model', 'sequence'] : ['gestures'])]);
  }
  for (const effect of value.effects) {
    if (!/^fx[1-9][0-9]{0,5}$/.test(effect.id) || nodes.has(effect.id) || !Object.hasOwn(effectControls, effect.type)) fail('effect ID or type');
    nodes.add(effect.id);
    if (typeof effect.bypass !== 'boolean') fail('effect bypass');
    for (const control of effectControls[effect.type]) number(effect.parameters?.[control.key], control.min, control.max, `${effect.id}.${control.key}`);
    if (effect.type === 'filter' && !['lowpass', 'highpass', 'bandpass', 'notch'].includes(String(effect.parameters.filterType))) fail('filter mode');
    if (effect.type === 'spectral' && typeof effect.parameters.freeze !== 'boolean') fail('spectral freeze');
    const keys = effectControls[effect.type].map((control) => control.key);
    const allowed = [...keys, ...(effect.type === 'filter' ? ['filterType'] : effect.type === 'spectral' ? ['freeze'] : [])];
    if (Object.keys(effect.parameters).some((key) => !allowed.includes(key))) fail('unknown effect parameter');
    lfoKeys.set(effect.id, keys);
    lockKeys.set(effect.id, allowed);
  }
  if (!value.layout || !value.lfos || Object.keys(value.layout).length !== nodes.size || Object.keys(value.lfos).length !== nodes.size) fail('node settings');
  for (const id of nodes) {
    const layout = value.layout?.[id];
    if (!layout || typeof layout.collapsed !== 'boolean') fail(`layout for ${id}`);
    if (layout.ignoreLlm !== undefined && typeof layout.ignoreLlm !== 'boolean') fail(`LLM setting for ${id}`);
    if (layout.ignoredParameters !== undefined && (!Array.isArray(layout.ignoredParameters) || new Set(layout.ignoredParameters).size !== layout.ignoredParameters.length || layout.ignoredParameters.some((key) => !lockKeys.get(id)!.includes(key)))) fail(`parameter locks for ${id}`);
    number(layout.x, 0, 100_000, 'node position'); number(layout.y, 0, 100_000, 'node position');
    const lfos = value.lfos?.[id];
    if (!lfos || typeof lfos !== 'object') fail(`LFOs for ${id}`);
    const keys = lfoKeys.get(id)!;
    if (Object.keys(lfos).length !== keys.length || keys.some((key) => !lfos[key])) fail(`missing LFO settings for ${id}`);
    for (const lfo of Object.values(lfos)) {
      if (typeof lfo.enabled !== 'boolean' || !['sine', 'triangle'].includes(lfo.waveform)) fail('LFO settings');
      number(lfo.depth, 0, 1, 'LFO depth'); number(lfo.periodSeconds, 20, 240, 'LFO period'); number(lfo.phaseRadians, -Infinity, Infinity, 'LFO phase');
    }
  }
  const seen = new Set<string>();
  for (const edge of value.connections) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === 'master' || edge.to.startsWith('source:')) fail('audio connection');
    const key = `${edge.from}>${edge.to}`; if (seen.has(key)) fail('duplicate connection'); seen.add(key);
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) fail('feedback cycle');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of value.connections) if (edge.from === id) visit(edge.to);
    visiting.delete(id); visited.add(id);
  };
  for (const node of nodes) visit(node);
}

/** Preserve uploaded/generated audio as PCM, rather than saving a browser blob URL. */
export function encodeSample(buffer: AudioBuffer): string {
  const channels = Math.min(2, buffer.numberOfChannels);
  const bytes = new ArrayBuffer(44 + buffer.length * channels * 2);
  const view = new DataView(bytes);
  const writeText = (at: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i)); };
  writeText(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); writeText(8, 'WAVE'); writeText(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
  writeText(36, 'data'); view.setUint32(40, bytes.byteLength - 44, true);
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let i = 0; i < buffer.length; i++) for (let ch = 0; ch < channels; ch++) {
    const sample = Math.max(-1, Math.min(1, data[ch][i]));
    view.setInt16(44 + (i * channels + ch) * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  const array = new Uint8Array(bytes); const chunks: string[] = [];
  for (let i = 0; i < array.length; i += 32768) chunks.push(String.fromCharCode(...array.subarray(i, i + 32768)));
  return btoa(chunks.join(''));
}
