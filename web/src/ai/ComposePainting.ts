import { compositionSnapshot, type PatchSnapshot } from './PatchPlan';
import { briefPrompt, parseBrief, parameterPrompt, composePatch, validateSfxTemplate, type MusicalBrief, type Composition } from './Composition';
import { requestImagePatch } from './ImageClient';
import { requestChat } from './ChatClient';
import { requestAvailableSamples, requestSoundEffect } from './SfxClient';
import { sampleIsFixed } from './ParameterPolicy';
import type { MoodSettings } from './MoodController';
import type { ModelSelection } from './OpenAIModels';

export type PaintingStage = 'interpreting' | 'composing' | 'correcting';
export interface PaintingResult { brief: MusicalBrief; composition: Composition; generated: Map<number, { keyword: string; audioUrl: string }> }

/** Uses the same briefs, schema, validation and sound-source policy as the debug client. */
export async function composePainting(file: File, original: PatchSnapshot, settings: MoodSettings, models: ModelSelection,
  recent: string[], signal: AbortSignal, onStage: (stage: PaintingStage, message: string) => void): Promise<PaintingResult> {
  if (!original.modules.length) throw new Error('This setup has no instruments. Choose a setup with an instrument.');
  const snapshot = compositionSnapshot(original);
  if (!snapshot.modules.length && !snapshot.effects?.length && snapshot.ignoredNodes?.includes('master')) throw new Error('All modules in this setup ignore composition changes. Choose another setup or unlock a module in the editor.');
  validateSfxTemplate(settings.prompts.sfxTemplate);
  const abort = new AbortController();
  const cancel = () => abort.abort(signal.reason);
  signal.throwIfAborted(); signal.addEventListener('abort', cancel, { once: true });
  const runSignal = abort.signal;
  async function validated<T>(instruction: string, system: string, request: (text: string) => Promise<string>, parse: (text: string) => T): Promise<T> {
    let text = await request(instruction);
    for (let attempt = 0; attempt < 3; attempt++) {
      runSignal.throwIfAborted();
      try { return parse(text); }
      catch (error) {
        const issue = error instanceof Error ? error.message : String(error);
        if (attempt === 2) throw new Error(`Could not complete this composition: ${issue}`);
        onStage('correcting', 'Refining the composition…');
        text = await request(`${instruction}\nThe response failed validation: ${issue}\nReturn a complete JSON object matching outputSchema. Preserve supported musical choices and every locked value. Use the original artwork as evidence; do not copy schema descriptions. Include each required module ID exactly once.\nResponse to correct:\n${text}`);
      }
    }
    throw new Error(`Could not complete the composition using ${system ? 'the saved prompts' : 'these settings'}.`);
  }
  try {
    onStage('interpreting', 'Looking at the painting…');
    const samples = snapshot.modules.some((module) => module.type === 'granular' && !sampleIsFixed(snapshot, module.id)) ? await requestAvailableSamples(runSignal) : [];
    const briefRequest = briefPrompt(snapshot, settings.intention, true, recent, samples, settings.prompts.sfxTemplate);
    const brief = await validated(briefRequest, settings.prompts.briefSystem,
      async (prompt) => (await requestImagePatch(prompt, settings.prompts.briefSystem, file, runSignal, models.image)).response,
      (text) => parseBrief(text, snapshot, true, samples, settings.prompts.sfxTemplate));
    onStage('composing', brief.imageSound ? 'Composing voices and creating a sound from the artwork…' : 'Composing the instruments…');
    const generated = new Map<number, { keyword: string; audioUrl: string }>();
    const parameterRequest = parameterPrompt(brief, snapshot, recent);
    const jobs = [
      validated(parameterRequest, settings.prompts.parameterSystem,
        (prompt) => requestChat(prompt, settings.prompts.parameterSystem, runSignal, models.text),
        (text) => composePatch(text, brief, snapshot, recent)),
      (async () => {
        for (const module of brief.modules.filter((item) => item.source === 'sfx')) {
          const sound = await requestSoundEffect(module.sfxPrompt!, runSignal, { durationSeconds: 8, promptInfluence: 0.55 });
          generated.set(module.id, { keyword: module.keyword!, audioUrl: sound.audioUrl });
        }
      })(),
    ] as const;
    try {
      const [composition] = await Promise.all(jobs);
      runSignal.throwIfAborted();
      return { brief, composition, generated };
    } catch (error) {
      abort.abort(); await Promise.allSettled(jobs); throw error;
    }
  } finally { signal.removeEventListener('abort', cancel); }
}
