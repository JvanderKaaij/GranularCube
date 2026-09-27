import { effectControls, type EffectKind, type EffectValues } from '../audio/EffectNode';
import type { PatchSnapshot } from './PatchPlan';

export interface EffectPlan { id: string; type: EffectKind; parameters: EffectValues }

/** Route metadata uses the same edges as the audio graph. Bypassed effects pass audio through. */
export function effectRouting(snapshot: PatchSnapshot) {
  const edges = snapshot.connections ?? [];
  function reachable(from: string, to: string, seen = new Set<string>()): boolean {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return edges.some((edge) => edge.from === from && reachable(edge.to, to, seen));
  }
  return (snapshot.effects ?? []).map((effect) => ({
    ...effect, reachesMaster: reachable(effect.id, 'master'),
    sourceIds: snapshot.modules.filter((source) => reachable(`source:${source.id}`, effect.id)).map((source) => source.id),
  }));
}

export function parseEffects(value: unknown, snapshot: PatchSnapshot): EffectPlan[] | undefined {
  if (snapshot.effects === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== snapshot.effects.length) throw new Error('Parameter response effects must include every current effect exactly once');
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Effect must be an object');
    const current = snapshot.effects!.find((effect) => effect.id === raw.id);
    if (!current || seen.has(raw.id) || current.type !== raw.type) throw new Error('Unknown, duplicate or mismatched effect');
    seen.add(raw.id);
    if (!raw.parameters || typeof raw.parameters !== 'object' || Array.isArray(raw.parameters)) throw new Error(`${raw.id}.parameters must be an object`);
    const parameters: EffectValues = {};
    for (const control of effectControls[current.type]) {
      const number = raw.parameters[control.key];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < control.min || number > control.max) throw new Error(`${raw.id}.${control.key} must be between ${control.min} and ${control.max}`);
      parameters[control.key] = Number(Math.min(control.max, control.min + Math.round((number - control.min) / control.step) * control.step).toFixed(4));
    }
    if (current.type === 'filter') {
      if (!['lowpass', 'highpass', 'bandpass', 'notch'].includes(raw.parameters.filterType)) throw new Error(`${raw.id}.filterType must be lowpass, highpass, bandpass or notch`);
      parameters.filterType = raw.parameters.filterType;
    }
    if (current.type === 'spectral') {
      if (typeof raw.parameters.freeze !== 'boolean') throw new Error(`${current.id}.freeze must be true or false`);
      parameters.freeze = raw.parameters.freeze;
    }
    return { id: current.id, type: current.type, parameters };
  });
}

/** Keep the first audible delay on each melodic source prominent, without enabling bypassed nodes. */
export function fitMelodicEffects(plans: EffectPlan[], snapshot: PatchSnapshot, melodicIds: number[], corrections: string[]): void {
  const routes = effectRouting(snapshot);
  for (const id of melodicIds) {
    const queue = [`source:${id}`], seen = new Set<string>();
    let delay: EffectPlan | undefined;
    while (queue.length && !delay) {
      const node = queue.shift()!;
      if (seen.has(node)) continue;
      seen.add(node);
      const route = routes.find((effect) => effect.id === node);
      if (route?.type === 'delay' && !route.bypass && route.reachesMaster) delay = plans.find((effect) => effect.id === node);
      else queue.push(...(snapshot.connections ?? []).filter((edge) => edge.from === node).map((edge) => edge.to));
    }
    if (!delay) continue;
    for (const [key, min, max] of [['mix', 0.55, 0.8], ['time', 0.5, 1.2], ['feedback', 0.58, 0.78]] as const) {
      const before = Number(delay.parameters[key]);
      delay.parameters[key] = Math.max(min, Math.min(max, before));
      if (before !== delay.parameters[key]) corrections.push(`${delay.id}.${key}: ${before} → ${delay.parameters[key]} (melodic atmosphere)`);
    }
  }
}
