import type { PatchPlan, PatchSnapshot } from './PatchPlan';

export function parameterIsIgnored(snapshot: PatchSnapshot, nodeId: string, key: string): boolean {
  return Boolean(snapshot.ignoredNodes?.includes(nodeId) || snapshot.ignoredParameters?.[nodeId]?.includes(key));
}

/** A fixed time window needs its original recording to retain its meaning and bounds. */
export function sampleIsFixed(snapshot: PatchSnapshot, id: number): boolean {
  return ['sample', 'selectionStart', 'selectionEnd'].some((key) => parameterIsIgnored(snapshot, `source:${id}`, key));
}

export function currentParameterValue(snapshot: PatchSnapshot, nodeId: string, key: string): unknown {
  if (nodeId === 'master') return (snapshot.master as unknown as Record<string, unknown>)[key];
  if (nodeId.startsWith('source:')) {
    const module = [...snapshot.modules, ...(snapshot.readOnly?.modules ?? [])].find((item) => `source:${item.id}` === nodeId);
    if (!module) return undefined;
    if (key === 'sample' && module.type === 'granular') return module.sample;
    if (key === 'sequence' && module.type === 'physical') return module.sequence;
    if (key === 'gestures' && module.type === 'piano_sampler') return module.gestures;
    return (module.parameters as unknown as Record<string, unknown>)[key];
  }
  return [...(snapshot.effects ?? []), ...(snapshot.readOnly?.effects ?? [])].find((effect) => effect.id === nodeId)?.parameters[key];
}

export function lockedParameterContext(snapshot: PatchSnapshot): object {
  return Object.fromEntries(Object.entries(snapshot.ignoredParameters ?? {}).map(([id, keys]) => {
    const protectedKeys = id.startsWith('source:') && sampleIsFixed(snapshot, Number(id.slice(7))) ? [...new Set([...keys, 'sample'])] : keys;
    return [id, Object.fromEntries(protectedKeys.map((key) => [key, currentParameterValue(snapshot, id, key)]))];
  }));
}

/** Locks take precedence over model values and automatic atmosphere/headroom adjustments. */
export function preserveParameterValues<T extends object>(proposed: T, current: T, snapshot: PatchSnapshot, id: string): T {
  const result = { ...proposed } as Record<string, unknown>;
  const before = current as Record<string, unknown>;
  for (const key of Object.keys(before)) if (parameterIsIgnored(snapshot, id, key)) result[key] = before[key];
  for (const [lower, upper] of [['lengthMin', 'lengthMax'], ['ampMin', 'ampMax'], ['selectionStart', 'selectionEnd'],
    ['filterFreqMin', 'filterFreqMax'], ['filterQMin', 'filterQMax'], ['gapMinSeconds', 'gapMaxSeconds']]) {
    if (typeof result[lower] !== 'number' || typeof result[upper] !== 'number' || result[lower] <= result[upper]) continue;
    if (parameterIsIgnored(snapshot, id, lower)) result[upper] = result[lower];
    else if (parameterIsIgnored(snapshot, id, upper)) result[lower] = result[upper];
  }
  return result as T;
}

export function preservePlanParameters(plan: PatchPlan, snapshot: PatchSnapshot): PatchPlan {
  return { ...plan, master: preserveParameterValues(plan.master, snapshot.master, snapshot, 'master'),
    modules: plan.modules.map((module) => {
      const current = snapshot.modules.find((item) => item.id === module.id);
      if (!current || current.type !== module.type) return module;
      const id = `source:${module.id}`;
      if (module.type === 'granular' && current.type === 'granular') return { ...module,
        sample: sampleIsFixed(snapshot, module.id) ? current.sample : module.sample,
        parameters: preserveParameterValues(module.parameters, current.parameters, snapshot, id) };
      if (module.type === 'piano_sampler' && current.type === 'piano_sampler') return { ...module,
        parameters: preserveParameterValues(module.parameters, current.parameters, snapshot, id),
        gestures: parameterIsIgnored(snapshot, id, 'gestures') ? structuredClone(current.gestures) : module.gestures };
      if (module.type === 'physical' && current.type === 'physical') {
        const parameters = preserveParameterValues(module.parameters, current.parameters, snapshot, id);
        const sequence = parameterIsIgnored(snapshot, id, 'sequence') ? [...current.sequence] : module.sequence;
        if (parameterIsIgnored(snapshot, id, 'sequence') && !parameterIsIgnored(snapshot, id, 'rootNote')) {
          // Retained offsets must stay playable even if the unprotected root moves.
          parameters.rootNote = Math.max(-Math.min(...sequence), Math.min(127 - Math.max(...sequence), parameters.rootNote));
        }
        return { ...module, parameters, sequence };
      }
      return module;
    }),
    effects: plan.effects?.map((effect) => {
      const current = snapshot.effects?.find((item) => item.id === effect.id);
      return current ? { ...effect, parameters: preserveParameterValues(effect.parameters, current.parameters, snapshot, effect.id) } : effect;
    }) };
}

/** Replace protected fields before validating a response, including older custom prompts. */
export function protectResponseFields(root: Record<string, unknown>, snapshot: PatchSnapshot): void {
  const protect = (value: unknown, id: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const raw = value as Record<string, unknown>;
    for (const key of snapshot.ignoredParameters?.[id] ?? []) {
      if (!['sample', 'sequence', 'gestures'].includes(key)) raw[key] = currentParameterValue(snapshot, id, key);
    }
  };
  protect(root.master, 'master');
  if (Array.isArray(root.modules)) for (const module of root.modules) {
    if (!module || typeof module !== 'object') continue;
    const id = `source:${module.id}`;
    protect(module.parameters, id);
    for (const key of ['sequence', 'gestures']) if (parameterIsIgnored(snapshot, id, key)) module[key] = currentParameterValue(snapshot, id, key);
    if (sampleIsFixed(snapshot, module.id)) module.sample = currentParameterValue(snapshot, id, 'sample');
  }
  if (Array.isArray(root.effects)) for (const effect of root.effects) {
    if (effect && typeof effect === 'object') protect(effect.parameters, effect.id);
  }
}
