import { granularControlGroups, physicalControlGroups, masterControlDefinitions, type PhysicalModel } from '../parameters';
import type { PatchSnapshot } from './PatchPlan';
import { effectControls, isSourceEffectParameter } from '../audio/EffectNode';
import { pianoControls } from '../audio/PianoProgram';
import { parameterIsIgnored, sampleIsFixed, currentParameterValue } from './ParameterPolicy';

type Schema = Record<string, unknown>;
const text = (maxLength = 900): Schema => ({ type: 'string', minLength: 1, maxLength });
const number = (minimum: number, maximum: number): Schema => ({ type: 'number', minimum, maximum });
const boolean = (): Schema => ({ type: 'boolean' });
const enumeration = (values: readonly (string | number)[]): Schema => ({ enum: values });
const object = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema =>
  ({ type: 'object', properties, required, additionalProperties: false });
const filterModes = ['lowpass', 'highpass', 'bandpass', 'notch'];

function protectProperties(schema: Schema, snapshot: PatchSnapshot, id: string): void {
  const properties = schema.properties as Record<string, Schema>;
  for (const key of Object.keys(properties)) if (parameterIsIgnored(snapshot, id, key)) properties[key] = { const: currentParameterValue(snapshot, id, key) };
}

function modules(snapshot: PatchSnapshot, variants: Schema[]): Schema {
  return {
    type: 'array', minItems: snapshot.modules.length, maxItems: snapshot.modules.length,
    items: variants.length ? { oneOf: variants } : false,
    ...(snapshot.modules.length ? { allOf: snapshot.modules.map((module) => ({
      contains: { type: 'object', properties: { id: { const: module.id } }, required: ['id'] },
      minContains: 1, maxContains: 1,
    })) } : {}),
  };
}

/** Structural constraints only: no completed descriptions, moods, sources or suggested settings. */
export function briefOutputSchema(snapshot: PatchSnapshot, image: boolean, availableSamples: string[]): Schema {
  const variants = snapshot.modules.map((module) => {
    const common = { id: { type: 'integer', const: module.id }, role: enumeration(['bed', 'texture', 'focal', 'accent']), weight: number(0.1, 1), reason: text() };
    if (module.type === 'piano_sampler') return object(common);
    return module.type === 'physical'
      ? object({ ...common, model: parameterIsIgnored(snapshot, `source:${module.id}`, 'model') ? { const: module.parameters.model } : enumeration(['bell', 'percussion', 'string']) })
      : object({ ...common, overlap: number(0.05, 8),
        sampleCandidates: { type: 'array', maxItems: 4, uniqueItems: true, items: enumeration(sampleIsFixed(snapshot, module.id) ? [module.sample] : availableSamples) },
        reuseReason: { type: 'string', maxLength: 900 },
      }, [...Object.keys(common), 'overlap']);
  });
  const properties: Record<string, Schema> = {
    description: text(), era: text(200),
  };
  const granularIds = snapshot.modules.filter((module) => module.type === 'granular' && !sampleIsFixed(snapshot, module.id)).map((module) => module.id);
  if (image && granularIds.length) {
    properties.imageSound = object({
      evidence: text(400), moduleId: enumeration(granularIds), source: text(100), action: text(150), character: text(150),
      basis: enumeration(['depicted', 'implied', 'material_analogy']),
    });
  }
  Object.assign(properties, {
    mood: text(), composition: text(),
    axes: object(Object.fromEntries(['tension', 'warmth', 'movement', 'density', 'space', 'brightness'].map((axis) => [axis, number(0, 1)]))),
    evolution: object({ amount: number(0, 1), periodSeconds: number(20, 180) }),
    modules: modules(snapshot, variants),
  });
  return object(properties);
}

interface ChosenSource { id: number; source?: 'built_in' | 'sfx'; sample?: string; model?: PhysicalModel }

export function parameterOutputSchema(snapshot: PatchSnapshot, sources: ChosenSource[]): Schema {
  const modular = snapshot.effects !== undefined;
  const variants = snapshot.modules.map((module) => {
    const source = sources.find((choice) => choice.id === module.id)!;
    const common = { id: { type: 'integer', const: module.id }, type: { const: module.type }, intent: text() };
    if (module.type === 'piano_sampler') {
      const keys = module.bank.samples.map((sample) => sample.midi);
      return object({ ...common,
        parameters: object(Object.fromEntries(pianoControls.map((control) => [control.key, number(control.min, control.max)]))),
        gestures: { type: 'array', minItems: keys.length >= 2 ? 1 : 0, maxItems: keys.length >= 2 ? 8 : 0,
          items: object({ label: text(120), notes: { type: 'array', minItems: 2, maxItems: 8,
            items: object({ midi: { type: 'integer', enum: keys }, offsetMs: number(0, 2000), velocity: number(0.05, 1) }) } }) },
      });
    }
    if (module.type === 'physical') {
      const controls = Object.fromEntries(physicalControlGroups.flatMap((group) => group.controls.filter((control) => !modular || !isSourceEffectParameter(control.key)).map((control) => [control.key, number(control.min, control.max)])));
      return object({ ...common,
        parameters: object({ ...controls, model: { const: source.model }, ...(!modular ? { filterType: enumeration(filterModes) } : {}) }, modular ? ['model'] : ['model', 'filterType']),
        sequence: { type: 'array', minItems: 4, maxItems: 16, items: { type: 'integer', minimum: -12, maximum: 24 } },
      });
    }
    const controls: Record<string, Schema> = {};
    for (const group of granularControlGroups) for (const control of group.controls) {
      for (const key of control.kind === 'range' ? control.keys : [control.key]) {
        if (modular && isSourceEffectParameter(key)) continue;
        controls[key] = key === 'selectionStart' || key === 'selectionEnd'
          ? source.source === 'sfx' || source.sample !== module.sample ? { const: 0 } : number(0, Math.ceil(module.sampleDurationMs))
          : number(control.min, control.max);
      }
    }
    if (!modular) controls.filterType = enumeration(filterModes);
    return object({ ...common,
      parameters: object(controls, Object.keys(controls).filter((key) => key !== 'density')),
      targetOverlap: number(0.05, 8),
    });
  });
  for (const variant of variants) {
    const props = variant.properties as Record<string, Schema>;
    const id = `source:${props.id.const}`;
    protectProperties(props.parameters, snapshot, id);
    for (const key of ['sequence', 'gestures']) if (props[key] && parameterIsIgnored(snapshot, id, key)) props[key] = { const: currentParameterValue(snapshot, id, key) };
  }
  const schema = object({
    master: object(Object.fromEntries(masterControlDefinitions.filter((control) => !snapshot.ignoredNodes?.includes('master') && (!modular || control.key === 'gain')).map((control) => [control.key, number(control.min, control.max)]))),
    modules: modules(snapshot, variants),
    ...(modular ? { effects: {
      type: 'array', minItems: snapshot.effects!.length, maxItems: snapshot.effects!.length,
      items: snapshot.effects!.length ? { oneOf: snapshot.effects!.map((effect) => object({
        id: { const: effect.id }, type: { const: effect.type }, intent: text(),
        parameters: object({ ...Object.fromEntries(effectControls[effect.type].map((control) => [control.key, number(control.min, control.max)])), ...(effect.type === 'filter' ? { filterType: enumeration(filterModes) } : {}), ...(effect.type === 'spectral' ? { freeze: boolean() } : {}) }),
      })) } : false,
      ...(snapshot.effects!.length ? { allOf: snapshot.effects!.map((effect) => ({ contains: { type: 'object', properties: { id: { const: effect.id } }, required: ['id'] }, minContains: 1, maxContains: 1 })) } : {}),
    } } : {}),
  });
  const props = schema.properties as Record<string, Schema>;
  protectProperties(props.master, snapshot, 'master');
  if (modular && snapshot.effects!.length) for (const variant of (props.effects.items as { oneOf: Schema[] }).oneOf) {
    const effect = variant.properties as Record<string, Schema>;
    protectProperties(effect.parameters, snapshot, String(effect.id.const));
  }
  return schema;
}
