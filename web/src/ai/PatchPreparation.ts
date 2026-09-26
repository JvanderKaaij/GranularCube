import type { PatchPlan, PatchSnapshot } from './PatchPlan';
import type { GranularPanel } from '../ui/GranularPanel';
import type { PhysicalPanel } from '../ui/PhysicalPanel';

/** Decode without mutation. A failed preparation never touches the active buffers. */
export async function preparePatchSamples(plan: PatchPlan, panels: Map<number, GranularPanel | PhysicalPanel>,
  snapshot: () => PatchSnapshot, generated: Map<number, { keyword: string; audioUrl: string }>, signal?: AbortSignal) {
  const expected = JSON.stringify(snapshot());
  const entries = await Promise.all(plan.modules.map(async (setting) => {
    const panel = panels.get(setting.id);
    if (!panel || panel.kind !== setting.type) throw new Error(`Module ${setting.id} is no longer available`);
    const sample = panel.kind === 'granular' && setting.type === 'granular'
      ? await panel.preparePatchSample(setting.sample, generated.get(setting.id), signal) : null;
    return { id: setting.id, panel, sample };
  }));
  const validate = () => {
    signal?.throwIfAborted();
    if (expected !== JSON.stringify(snapshot())) throw new Error('Patch changed while preparing samples; retry to preserve your edits.');
    for (const item of entries) {
      if (panels.get(item.id) !== item.panel) throw new Error(`Module ${item.id} was removed`);
      item.sample?.validate();
    }
  };
  validate();
  let committed = false;
  return { entries, validate, commit(blendSeconds: number) {
    if (committed) throw new Error('Patch buffers already committed');
    validate();
    for (const item of entries) item.sample?.commit(blendSeconds);
    committed = true;
  } };
}
