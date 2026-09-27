import { compositionSnapshot, type PatchPlan, type PatchSnapshot } from './PatchPlan';
import { PATCH_TRANSITION_MS } from './PatchTransition';
import { requestImagePatch } from './ImageClient';
import { requestAvailableSamples, requestSoundEffect } from './SfxClient';
import { requestChat } from './ChatClient';
import { briefPrompt, parseBrief, parameterPrompt, composePatch, type ApplicationOptions, type ApplicationReport } from './Composition';
import { createPromptEditor, type PromptSettings } from '../ui/PromptEditor';
import type { ModelSelection } from './OpenAIModels';
import { sampleIsFixed } from './ParameterPolicy';

export interface MoodSettings {
  intention: string;
  transitionSeconds: number;
  evolutionEnabled: boolean;
  prompts: PromptSettings;
}
export interface MoodController {
  root: HTMLElement;
  updateOverview(): void;
  cancelPending(): void;
  getSettings(): MoodSettings;
  applySettings(settings: MoodSettings): void;
}
export function createMoodController(
  getSnapshot: () => PatchSnapshot,
  applyPlan: (plan: PatchPlan, durationMs: number, onProgress: (progress: number) => void,
    generatedSamples?: Map<number, { keyword: string; audioUrl: string }>, startImageModules?: boolean,
    options?: ApplicationOptions) => Promise<ApplicationReport>,
  setEvolution: (enabled: boolean) => void = () => {},
  getModels: () => ModelSelection = () => ({ text: 'gpt-6-sol', image: 'gpt-6-sol' }),
): MoodController {
  const root = document.createElement('section');
  root.className = 'mood-node';
  root.setAttribute('aria-label', 'Mood composition');
  root.innerHTML = `
    <div class="mood-head"><span class="mood-symbol">◇</span><div><span class="node-kicker">COMPOSITION</span><h2>mood~</h2></div><button class="mood-close icon-button" type="button" aria-label="Collapse mood settings" title="Collapse mood settings">×</button></div>
    <div class="mood-flow">BRIEF → VOICES → SOUNDSCAPE</div>
    <div class="mood-body">
      <label class="mood-label" for="mood-prompt">MOOD / INTENTION</label>
      <textarea id="mood-prompt" rows="5" placeholder="Describe a mood, or interpret a painting below…"></textarea>
      <label class="mood-transition-label" for="mood-transition"><span>TRANSITION TIME</span><output id="mood-transition-value">${PATCH_TRANSITION_MS / 1000} s</output></label>
      <input id="mood-transition" type="range" min="0.2" max="30" step="0.1" value="${PATCH_TRANSITION_MS / 1000}" />
      <label class="mood-label evolution-control"><input class="evolution-enabled" type="checkbox" checked /> SLOW EVOLUTION</label>
      <button class="mood-apply" type="button">↗ COMPOSE & APPLY</button>
      <div class="image-patch-control">
        <label class="mood-label" for="image-patch-file">PAINTING</label>
        <input id="image-patch-file" type="file" accept="image/png,image/jpeg,image/webp" />
        <div class="image-patch-hint">The painting creates a new musical brief and replaces the intention above.</div>
        <div class="image-patch-preview" hidden><img alt="Selected painting" /></div>
        <button class="image-patch-apply" type="button">▧ INTERPRET & COMPOSE</button>
        <div class="image-patch-scene" aria-live="polite"></div>
        <div class="image-patch-composition" aria-live="polite"></div>
      </div>
      <button class="mood-cancel mini-button" type="button" hidden>CANCEL REQUEST</button>
      <div class="mood-status" role="status">Ready to shape the current patch.</div>
      <div class="pipeline-summary" aria-live="polite"></div>
      <div class="mood-progress" hidden><span>TRANSITION <output>0%</output></span><progress max="100" value="0"></progress></div>
      <details class="mood-details" open><summary>PIPELINE DEBUG</summary><pre class="pipeline-debug">No composition yet.</pre></details>
      <div class="prompt-tools-mount"></div>
      <details class="mood-details"><summary>CURRENT BASE SETTINGS</summary><pre class="mood-current"></pre></details>
      <details class="mood-details"><summary>LAST APPLIED PATCH</summary><pre class="mood-response">—</pre></details>
      <details class="mood-details"><summary>REQUESTS & MODEL OUTPUTS</summary><pre class="pipeline-raw">—</pre></details>
    </div>`;
  const query = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const prompt = query<HTMLTextAreaElement>('#mood-prompt');
  const button = query<HTMLButtonElement>('.mood-apply');
  const imageButton = query<HTMLButtonElement>('.image-patch-apply');
  const imageInput = query<HTMLInputElement>('#image-patch-file');
  const preview = query<HTMLElement>('.image-patch-preview');
  const scene = query<HTMLElement>('.image-patch-scene');
  const composition = query<HTMLElement>('.image-patch-composition');
  const transition = query<HTMLInputElement>('#mood-transition');
  const cancel = query<HTMLButtonElement>('.mood-cancel');
  const progressBox = query<HTMLElement>('.mood-progress');
  const progressBar = query<HTMLProgressElement>('.mood-progress progress');
  const progressValue = query<HTMLOutputElement>('.mood-progress output');
  const debugView = query<HTMLElement>('.pipeline-debug');
  const rawView = query<HTMLElement>('.pipeline-raw');
  const promptEditor = createPromptEditor();
  query<HTMLElement>('.prompt-tools-mount').append(promptEditor.root);
  query<HTMLButtonElement>('.mood-close').addEventListener('click', () => {
    const dock = root.closest<HTMLElement>('.mood-dock');
    if (dock) dock.hidden = true;
    document.querySelector<HTMLButtonElement>('#show-mood')?.setAttribute('aria-expanded', 'false');
  });
  let active: AbortController | null = null;
  let previewUrl: string | null = null;
  const history: string[][] = [];
  let settingsRevision = 0;
  const setStatus = (text: string, error = false) => {
    query<HTMLElement>('.mood-status').textContent = text;
    query<HTMLElement>('.mood-status').classList.toggle('error', error);
  };
  transition.addEventListener('input', () => { query<HTMLOutputElement>('#mood-transition-value').value = `${Number(transition.value).toFixed(1)} s`; });
  query<HTMLInputElement>('.evolution-enabled').addEventListener('change', (e) => setEvolution((e.target as HTMLInputElement).checked));
  cancel.addEventListener('click', () => active?.abort());
  imageInput.addEventListener('change', () => {
    active?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = imageInput.files?.[0] ? URL.createObjectURL(imageInput.files[0]) : null;
    preview.hidden = !previewUrl;
    preview.querySelector('img')!.src = previewUrl ?? '';
    scene.textContent = composition.textContent = '';
  });
  const controller: MoodController = {
    root, cancelPending: () => active?.abort(),
    updateOverview() { query<HTMLElement>('.mood-current').textContent = JSON.stringify(getSnapshot(), null, 2); },
    getSettings() {
      return { intention: prompt.value, transitionSeconds: Number(transition.value),
        evolutionEnabled: query<HTMLInputElement>('.evolution-enabled').checked, prompts: promptEditor.getSettings() };
    },
    applySettings(settings) {
      settingsRevision++;
      active?.abort();
      promptEditor.applySettings(settings.prompts);
      prompt.value = settings.intention;
      transition.value = String(settings.transitionSeconds);
      query<HTMLOutputElement>('#mood-transition-value').value = `${settings.transitionSeconds.toFixed(1)} s`;
      query<HTMLInputElement>('.evolution-enabled').checked = settings.evolutionEnabled;
      setEvolution(settings.evolutionEnabled);
      history.length = 0;
      imageInput.value = '';
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null; preview.hidden = true; preview.querySelector('img')!.removeAttribute('src');
      scene.textContent = composition.textContent = '';
      query<HTMLElement>('.mood-response').textContent = '—';
      debugView.textContent = 'Setup loaded. Ready for a new composition.';
      rawView.textContent = '—'; query<HTMLElement>('.pipeline-summary').textContent = '';
      setStatus('Setup loaded. Ready to shape the current patch.');
      controller.updateOverview();
    },
  };

  async function run(mode: 'mood' | 'image'): Promise<void> {
    if (active) return;
    const file = imageInput.files?.[0];
    if (mode === 'image' && !file) { setStatus('Choose a painting first.', true); return; }
    if (mode === 'mood' && !prompt.value.trim()) { setStatus('Describe a mood first.', true); return; }
    const originalSnapshot = getSnapshot();
    const snapshot = compositionSnapshot(originalSnapshot);
    const runRevision = settingsRevision;
    if (!originalSnapshot.modules.length) { setStatus('Add an instrument first.', true); return; }
    if (!snapshot.modules.length && !snapshot.effects?.length && snapshot.ignoredNodes?.includes('master')) {
      setStatus('Every node has IGNORE LLM enabled. Uncheck a node to compose new settings.', true); return;
    }
    let prompts: PromptSettings;
    try { prompts = promptEditor.getSettings(); }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error), true); return; }
    // Snapshot the prompt edits once, so edits made during generation affect the next run.
    promptEditor.beginRun();
    const abort = new AbortController();
    active = abort;
    const durationMs = Number(transition.value) * 1000;
    const { text: selectedTextModel, image: selectedImageModel } = getModels();
    const modelForBrief = mode === 'image' ? selectedImageModel : selectedTextModel;
    const started = performance.now();
    const timings: Record<string, number> = {};
    const running = new Map<string, number>();
    const repairs: string[] = [];
    const debug: Record<string, unknown> = { status: 'Preparing', repairs, ignoredNodes: snapshot.ignoredNodes ?? [], ignoredParameters: snapshot.ignoredParameters ?? {} };
    const raw: Record<string, unknown> = { sfxPromptTemplate: prompts.sfxTemplate, models: { text: selectedTextModel, painting: selectedImageModel, brief: modelForBrief } };
    let timedOut = false;
    let internalFailure = false;
    const timeout = window.setTimeout(() => { timedOut = true; abort.abort(); }, 300_000);
    const render = () => {
      if (runRevision !== settingsRevision) return;
      query<HTMLElement>('.pipeline-summary').textContent = [
        ...Object.entries(timings).map(([key, value]) => `${key}: ${(value / 1000).toFixed(1)}s`),
        ...[...running].map(([key, value]) => `${key}: ${((performance.now() - value) / 1000).toFixed(1)}s…`),
      ].join(' · ');
      debugView.textContent = JSON.stringify({ ...debug, timingsSeconds: Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, +(v / 1000).toFixed(2)])),
        activeStages: Object.fromEntries([...running].map(([k, v]) => [k, `${((performance.now() - v) / 1000).toFixed(1)}s`])) }, null, 2);
      rawView.textContent = JSON.stringify(raw, null, 2);
    };
    const interval = window.setInterval(render, 500);
    const timed = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = performance.now(); running.set(name, start); render();
      try { return await fn(); } finally { timings[name] = performance.now() - start; running.delete(name); render(); }
    };
    const validResponse = async <T,>(name: string, instruction: string, system: string, first: () => Promise<string>, parse: (text: string) => T, repair?: (instruction: string) => Promise<string>): Promise<T> => {
      abort.signal.throwIfAborted();
      const model = name === 'brief' ? modelForBrief : selectedTextModel;
      const title = `${name === 'brief' ? (mode === 'image' ? 'Painting' : 'Mood') + ' brief' : 'Synth parameters & notes'} · ${model}`;
      promptEditor.recordRequest(title, instruction, system);
      let text = await first(); abort.signal.throwIfAborted(); raw[`${name}Response`] = text;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { return parse(text); }
        catch (error) {
          const issue = error instanceof Error ? error.message : String(error);
          if (attempt === 2) throw new Error(`${name} response still failed validation after two corrections: ${issue}`);
          repairs.push(`${name}: ${issue}; requesting correction ${attempt + 1}/2`);
          render();
          const grounding = name === 'brief'
            ? `Use the original ${mode === 'image' ? 'uploaded artwork' : 'mood intention'} as evidence. Replace copied formatting text and revisit any unsupported sound source or evidence.`
            : 'Compose from the validated brief and its sonic evidence. Preserve supported musical choices while correcting invalid fields.';
          const correction = `${instruction}\nYour response failed validation: ${issue}\nReturn a complete JSON object whose actual composed values conform to outputSchema. Do not return the schema or copy its field descriptions. Include every required module ID exactly once. ${grounding}\nResponse to correct:\n${text}`;
          raw[`${name}CorrectionPrompt${attempt + 1}`] = correction;
          promptEditor.recordRequest(`${title} · correction ${attempt + 1}/2`, correction, system);
          text = await (repair ? repair(correction) : requestChat(correction, system, abort.signal, model));
          raw[`${name}RepairedResponse${attempt + 1}`] = text;
        }
      }
      throw new Error(`${name} response could not be validated`);
    };
    button.disabled = imageButton.disabled = true;
    cancel.hidden = false;
    progressBox.hidden = true;
    try {
      setStatus('Interpreting atmosphere, roles and sound sources…');
      const recent = history.flat();
      const availableSamples = snapshot.modules.some((module) => module.type === 'granular' && !sampleIsFixed(snapshot, module.id))
        ? await timed('sampleAvailability', () => requestAvailableSamples(abort.signal)) : [];
      raw.availableSampleFilenames = availableSamples;
      const briefRequest = briefPrompt(snapshot, prompt.value.trim(), mode === 'image', recent, availableSamples, prompts.sfxTemplate);
      raw.briefPrompt = briefRequest;
      raw.briefSystem = prompts.briefSystem;
      const brief = await timed(mode === 'image' ? 'imageInterpretation' : 'moodInterpretation', () => validResponse('brief', briefRequest, prompts.briefSystem,
        async () => mode === 'image' ? (await requestImagePatch(briefRequest, prompts.briefSystem, file!, abort.signal, selectedImageModel)).response : requestChat(briefRequest, prompts.briefSystem, abort.signal, selectedTextModel),
        (text) => parseBrief(text, snapshot, mode === 'image', availableSamples, prompts.sfxTemplate),
        mode === 'image' ? async (instruction) => (await requestImagePatch(instruction, prompts.briefSystem, file!, abort.signal, selectedImageModel)).response : undefined));
      abort.signal.throwIfAborted();
      prompt.value = brief.mood;
      scene.textContent = `${brief.description}${mode === 'image' ? ` Era: ${brief.era}` : ''}`;
      composition.textContent = brief.composition;
      debug.brief = brief;
      const hasSfx = brief.modules.some((module) => module.source === 'sfx');
      debug.status = hasSfx ? 'Generating parameters and artwork sound in parallel' : 'Generating parameters with catalog samples';
      debug.sfx = hasSfx ? { status: 'Requested', requests: brief.modules.filter((module) => module.source === 'sfx').map((module) => ({ id: module.id, prompt: module.sfxPrompt, durationSeconds: 8, basis: brief.imageSound?.basis })) }
        : { status: 'Not applicable: text request, no editable granular voice, or all sample sources/windows are locked' };
      render();
      setStatus(hasSfx ? `Generating an eight-second artwork sound: ${brief.imageSound?.source}…` : 'Brief ready. Composing the available instruments…');
      const patchRequest = parameterPrompt(brief, snapshot, recent);
      raw.parameterPrompt = patchRequest;
      raw.parameterSystem = prompts.parameterSystem;
      const generatedSamples = new Map<number, { keyword: string; audioUrl: string }>();
      const jobs = [
        timed('parameterGeneration', () => validResponse('parameters', patchRequest, prompts.parameterSystem,
          () => requestChat(patchRequest, prompts.parameterSystem, abort.signal, selectedTextModel), (text) => composePatch(text, brief, snapshot, recent))),
        timed('sfxGeneration', async () => {
          try {
            for (const module of brief.modules.filter((m) => m.source === 'sfx')) {
              raw.sfxRequest = { prompt: module.sfxPrompt, duration_seconds: 8, prompt_influence: 0.55 };
              promptEditor.recordRequest('ElevenLabs · artwork sound', JSON.stringify(raw.sfxRequest, null, 2));
              const sound = await requestSoundEffect(module.sfxPrompt!, abort.signal, { durationSeconds: 8, promptInfluence: 0.55 });
              generatedSamples.set(module.id, { keyword: module.keyword!, audioUrl: sound.audioUrl });
              debug.sfx = { status: 'Generated; waiting for sample preparation', id: module.id, filename: sound.filename, prompt: module.sfxPrompt };
              render();
            }
          } catch (error) {
            debug.sfx = { status: abort.signal.aborted ? 'Canceled before generation completed' : 'Generation failed', error: error instanceof Error ? error.message : String(error) };
            render();
            throw error;
          }
        }),
      ] as const;
      let result: Awaited<typeof jobs[0]>;
      try { [result] = await Promise.all(jobs); }
      catch (error) {
        internalFailure = !abort.signal.aborted;
        abort.abort();
        await Promise.allSettled(jobs);
        throw error;
      }
      abort.signal.throwIfAborted();
      if (JSON.stringify(originalSnapshot) !== JSON.stringify(getSnapshot())) throw new Error('Patch changed during composition. Retry to preserve your manual edits.');
      debug.decisions = result.debug;
      for (const change of result.debug.changes) if (change.key === 'sample' && typeof change.id === 'number' && generatedSamples.has(change.id)) change.after = `AI · ${generatedSamples.get(change.id)!.keyword}`;
      const report = await applyPlan(result.plan, durationMs, (progress) => {
        progressBar.value = Math.round(progress * 100); progressValue.value = `${progressBar.value}%`;
      }, generatedSamples, mode === 'image', { signal: abort.signal, movement: result.movement,
        onPhase(phase) {
          debug.status = phase === 'decode' ? 'Fetching and decoding all samples' : 'Transitioning';
          setStatus(phase === 'decode' ? 'Preparing all samples; current soundscape continues…' : 'All samples ready. Transitioning together…');
          if (phase === 'decode') running.set('samplePreparation', performance.now());
          else { timings.samplePreparation = performance.now() - (running.get('samplePreparation') ?? performance.now()); running.delete('samplePreparation'); }
          progressBox.hidden = phase !== 'transition'; progressBar.value = 0; progressValue.value = '0%'; render();
        } });
      timings.samplePreparation = report.decodeMs;
      timings.transition = report.transitionMs;
      debug.decodedSamples = report.samples;
      if (report.piano?.length) debug.piano = report.piano;
      if (hasSfx) debug.sfx = { status: 'Decoded and installed', sources: Object.fromEntries(generatedSamples) };
      query<HTMLElement>('.mood-response').textContent = JSON.stringify({ brief, ...result.plan, actualAppliedState: getSnapshot(), generatedSources: Object.fromEntries(generatedSamples), movement: result.movement }, null, 2);
      history.push(result.plan.modules.flatMap((m) => m.type === 'granular' && !generatedSamples.has(m.id) ? [m.sample] : []));
      if (history.length > 4) history.shift();
      debug.status = 'Applied';
      debug.evolution = result.movement;
      setStatus('Soundscape applied. Slow evolution follows the musical brief.');
      controller.updateOverview();
    } catch (error) {
      const canceled = abort.signal.aborted && !internalFailure;
      abort.abort();
      const message = timedOut ? 'Request timed out.' : canceled ? 'Request canceled.' : error instanceof Error ? error.message : String(error);
      debug.status = 'Not completed'; debug.error = message;
      if (runRevision === settingsRevision) setStatus(message, true);
    } finally {
      window.clearTimeout(timeout); window.clearInterval(interval);
      timings.total = performance.now() - started;
      for (const [name, time] of running) timings[name] = performance.now() - time;
      running.clear(); render();
      active = null; button.disabled = imageButton.disabled = false; cancel.hidden = true; progressBox.hidden = true;
    }
  }
  button.addEventListener('click', () => { void run('mood'); });
  imageButton.addEventListener('click', () => { void run('image'); });
  controller.updateOverview();
  return controller;
}
