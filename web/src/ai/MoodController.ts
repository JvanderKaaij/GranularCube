import { buildImagePatchPrompt, buildMoodPrompt, IMAGE_PATCH_SYSTEM_PROMPT, parseImagePatchPlan, parsePatchPlan, PATCH_SYSTEM_PROMPT, type PatchPlan, type PatchSnapshot } from './PatchPlan';
import { PATCH_TRANSITION_MS } from './PatchTransition';
import { IMAGE_PATCH_URL, requestImagePatch } from './ImageClient';
import { requestSoundEffect } from './SfxClient';

const CHAT_URL = 'http://0.0.0.0:8000/api/chat';
const LOCAL_FALLBACK_URL = 'http://127.0.0.1:8000/api/chat';
const MODEL = 'gpt-6-luna';
const REQUEST_TIMEOUT_MS = 120_000;

interface ChatResponse {
  success: boolean;
  response: string;
  is_mock?: boolean;
}

export interface MoodController {
  root: HTMLElement;
  updateOverview(): void;
}

export interface ImageCompositionActions {
  prepareImageLayers(): number[];
  discardImageLayers(ids: number[]): void;
}

function sameModuleContext(before: PatchSnapshot, now: PatchSnapshot): boolean {
  if (before.modules.length !== now.modules.length) return false;
  return before.modules.every((module, index) => {
    const current = now.modules[index];
    return current.id === module.id && current.type === module.type &&
      (module.type !== 'granular' || (current.type === 'granular' && current.sample === module.sample));
  });
}

export function createMoodController(
  getSnapshot: () => PatchSnapshot,
  applyPlan: (plan: PatchPlan, durationMs: number, onProgress: (progress: number) => void, generatedSamples?: Map<number, { keyword: string; audioUrl: string }>, startImageModules?: boolean) => Promise<void>,
  imageActions: ImageCompositionActions,
): MoodController {
  const root = document.createElement('section');
  root.className = 'mood-node';
  root.setAttribute('aria-label', 'Mood settings API');
  root.innerHTML = `
    <div class="mood-head"><span class="mood-symbol">◇</span><div><span class="node-kicker">CONTROL / API 01</span><h2>mood~</h2></div></div>
    <div class="mood-flow">PROMPT <span>→</span> JSON <span>→</span> PATCH</div>
    <div class="mood-body">
      <label class="mood-label" for="mood-prompt">MOOD / INTENTION</label>
      <textarea id="mood-prompt" rows="4" placeholder="Soft, nocturnal, spacious, gently shimmering…">Soft, nocturnal, spacious, gently shimmering</textarea>
      <label class="mood-transition-label" for="mood-transition"><span>TRANSITION TIME</span><output id="mood-transition-value">${(PATCH_TRANSITION_MS / 1000).toFixed(1)} s</output></label>
      <input id="mood-transition" type="range" min="0.2" max="30" step="0.1" value="${PATCH_TRANSITION_MS / 1000}" aria-label="Mood transition time in seconds" />
      <button class="mood-apply" type="button">↗ REQUEST & APPLY</button>
      <div class="image-patch-control">
        <label class="mood-label" for="image-patch-file">IMAGE / SCENE INPUT</label>
        <input id="image-patch-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Image for synth patch" />
        <div class="image-patch-hint">MOOD / INTENTION above gives optional scene direction.</div>
        <div class="image-patch-preview" hidden><img alt="Selected scene" /></div>
        <button class="image-patch-apply" type="button">▧ IMAGE → PATCH + SFX</button>
        <div class="image-patch-scene" aria-live="polite"></div>
        <div class="image-patch-composition" aria-live="polite"></div>
      </div>
      <div class="mood-status" role="status">Ready to shape the current patch.</div>
      <div class="mood-progress" hidden><span>TRANSITION <output>0%</output></span><progress max="100" value="0"></progress></div>
      <details class="mood-details"><summary>CURRENT SETTINGS</summary><pre class="mood-current"></pre></details>
      <details class="mood-details"><summary>LAST APPLIED RESPONSE</summary><pre class="mood-response">—</pre></details>
      <div class="mood-endpoint">MOOD POST ${CHAT_URL}<br />IMAGE POST ${IMAGE_PATCH_URL}<br />MOOD MODEL ${MODEL} · IMAGE MODEL OPENAI_VISION_MODEL</div>
    </div>
  `;
  const prompt = root.querySelector<HTMLTextAreaElement>('#mood-prompt')!;
  const button = root.querySelector<HTMLButtonElement>('.mood-apply')!;
  const imageInput = root.querySelector<HTMLInputElement>('#image-patch-file')!;
  const imageButton = root.querySelector<HTMLButtonElement>('.image-patch-apply')!;
  const imagePreview = root.querySelector<HTMLElement>('.image-patch-preview')!;
  const imagePreviewImage = imagePreview.querySelector<HTMLImageElement>('img')!;
  const scene = root.querySelector<HTMLElement>('.image-patch-scene')!;
  const composition = root.querySelector<HTMLElement>('.image-patch-composition')!;
  const transitionInput = root.querySelector<HTMLInputElement>('#mood-transition')!;
  const transitionValue = root.querySelector<HTMLOutputElement>('#mood-transition-value')!;
  const progressBox = root.querySelector<HTMLElement>('.mood-progress')!;
  const progressBar = progressBox.querySelector<HTMLProgressElement>('progress')!;
  const progressValue = progressBox.querySelector<HTMLOutputElement>('output')!;
  const status = root.querySelector<HTMLElement>('.mood-status')!;
  const current = root.querySelector<HTMLElement>('.mood-current')!;
  const lastResponse = root.querySelector<HTMLElement>('.mood-response')!;

  transitionInput.addEventListener('input', () => {
    transitionValue.value = `${Number(transitionInput.value).toFixed(1)} s`;
  });

  let previewUrl: string | null = null;
  imageInput.addEventListener('change', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = imageInput.files?.[0];
    previewUrl = file ? URL.createObjectURL(file) : null;
    imagePreview.hidden = !previewUrl;
    imagePreviewImage.src = previewUrl || '';
    scene.textContent = '';
    composition.textContent = '';
  });

  function setStatus(message: string, error = false): void {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  const controller: MoodController = {
    root,
    updateOverview() {
      current.textContent = JSON.stringify(getSnapshot(), null, 2);
    },
  };

  async function runRequest(mode: 'mood' | 'image'): Promise<void> {
    const mood = prompt.value.trim();
    if (mode === 'mood' && !mood) {
      setStatus('Describe a mood before requesting settings.', true);
      prompt.focus();
      return;
    }
    const imageFile = imageInput.files?.[0];
    if (mode === 'image' && !imageFile) {
      setStatus('Choose an image before requesting a scene patch.', true);
      imageInput.focus();
      return;
    }
    if (mode === 'mood') {
      scene.textContent = '';
      composition.textContent = '';
    }
    const addedImageLayers = mode === 'image' ? imageActions.prepareImageLayers() : [];
    let applied = false;
    const snapshot = getSnapshot();
    const durationMs = Number(transitionInput.value) * 1000;
    if (snapshot.modules.length === 0) {
      setStatus('Add an instrument module first.', true);
      return;
    }

    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), mode === 'image' ? REQUEST_TIMEOUT_MS * 2 : REQUEST_TIMEOUT_MS);
    button.disabled = true;
    imageButton.disabled = true;
    setStatus(mode === 'image' ? 'Describing image and designing connected synth + SFX settings…' : `Requesting settings for ${snapshot.modules.length} module${snapshot.modules.length === 1 ? '' : 's'}…`);
    try {
      let responseText: string;
      if (mode === 'image') {
        const body = await requestImagePatch(buildImagePatchPrompt(mood, snapshot), IMAGE_PATCH_SYSTEM_PROMPT, imageFile!, abort.signal);
        responseText = body.response;
      } else {
        const request: RequestInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: buildMoodPrompt(mood, snapshot), system_prompt: PATCH_SYSTEM_PROMPT, model: MODEL }),
          signal: abort.signal,
        };
        let response: Response;
        try {
          response = await fetch(CHAT_URL, request);
        } catch (error) {
          if (abort.signal.aborted) throw error;
          response = await fetch(LOCAL_FALLBACK_URL, request);
        }
        if (!response.ok) {
          let detail = `HTTP ${response.status}`;
          try {
            const body: unknown = await response.json();
            if (typeof body === 'object' && body !== null && 'detail' in body) detail = String(body.detail);
          } catch { /* Use the status code. */ }
          throw new Error(`API request failed: ${detail}`);
        }
        const body: ChatResponse = await response.json();
        if (!body.success || typeof body.response !== 'string') throw new Error('API response is missing generated settings');
        if (body.is_mock) throw new Error('API is in mock mode; configure its OpenAI key to generate settings.');
        responseText = body.response;
      }
      const imageResult = mode === 'image' ? parseImagePatchPlan(responseText, snapshot) : null;
      const plan = imageResult?.plan ?? parsePatchPlan(responseText, snapshot);
      if (!sameModuleContext(snapshot, getSnapshot())) throw new Error('Modules or samples changed during the request. Please try again.');
      const generatedSamples = new Map<number, { keyword: string; audioUrl: string }>();
      if (imageResult) {
        for (const [id, keyword] of imageResult.sfxKeywords) {
          setStatus(`Generating scene sound “${keyword}” for GRAIN ${String(id).padStart(2, '0')}…`);
          const generated = await requestSoundEffect(keyword, abort.signal);
          generatedSamples.set(id, { keyword, audioUrl: generated.audioUrl });
        }
        if (!sameModuleContext(snapshot, getSnapshot())) throw new Error('Modules or samples changed while generating sounds. Please try again.');
      }
      setStatus('Loading samples and moving to the new settings…');
      progressBox.hidden = false;
      progressBar.value = 0;
      progressValue.value = '0%';
      await applyPlan(plan, durationMs, (progress) => {
        const percent = Math.round(progress * 100);
        progressBar.value = percent;
        progressValue.value = `${percent}%`;
      }, generatedSamples, Boolean(imageResult));
      applied = true;
      if (imageResult) {
        prompt.value = imageResult.mood;
        scene.textContent = imageResult.description;
        composition.textContent = imageResult.composition;
      }
      lastResponse.textContent = JSON.stringify(imageResult
        ? { description: imageResult.description, mood: imageResult.mood, composition: imageResult.composition, ...plan, roles: Object.fromEntries(imageResult.roles), sources: Object.fromEntries(imageResult.sources), sfx_keywords: Object.fromEntries(imageResult.sfxKeywords) }
        : plan, null, 2);
      controller.updateOverview();
      setStatus(`${mode === 'image' ? 'Applied image composition' : 'Applied mood'} to ${plan.modules.length} module${plan.modules.length === 1 ? '' : 's'}. ${mode === 'image' ? 'Layers are playing.' : 'New grains and strikes use these settings.'}`);
    } catch (error) {
      if (!applied && addedImageLayers.length) imageActions.discardImageLayers(addedImageLayers);
      const message = error instanceof Error ? error.message : 'Request failed';
      setStatus(error instanceof DOMException && error.name === 'AbortError'
        ? 'The request timed out.'
        : message === 'Failed to fetch'
          ? `Could not reach ${mode === 'image' ? IMAGE_PATCH_URL : `${CHAT_URL} or ${LOCAL_FALLBACK_URL}`}. Check that the API is running.`
          : message, true);
    } finally {
      window.clearTimeout(timeout);
      button.disabled = false;
      imageButton.disabled = false;
      progressBox.hidden = true;
    }
  }

  button.addEventListener('click', () => { void runRequest('mood'); });
  imageButton.addEventListener('click', () => { void runRequest('image'); });

  controller.updateOverview();
  return controller;
}
