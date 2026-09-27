import { OPENAI_MODELS, isOpenAIModel, type ModelSelection } from '../ai/OpenAIModels';
import { listSetups, readSetup, saveSetup, setDefaultSetup } from '../config/SetupClient';
import { validateSetup, type PatchSetup, type SetupSummary } from '../config/Setup';

export interface ConfigController {
  root: HTMLElement;
  getModels(): ModelSelection;
  applyModels(models: ModelSelection): void;
  initialize(): Promise<void>;
}

export function createConfigController(
  capture: () => PatchSetup,
  apply: (setup: PatchSetup, autoplay: boolean) => Promise<void>,
): ConfigController {
  const root = document.createElement('section');
  root.className = 'config-node';
  root.setAttribute('aria-label', 'Setup configuration');
  const modelOptions = OPENAI_MODELS.map(({ id, label }) => `<option value="${id}" ${id === 'gpt-6-sol' ? 'selected' : ''}>${label}</option>`).join('');
  root.innerHTML = `
    <div class="config-head"><div><span class="node-kicker">SETUPS & MODELS</span><h2>config</h2></div><button class="config-close icon-button" type="button" aria-label="Close config">×</button></div>
    <div class="config-body">
      <section class="config-section"><h3>SAVED SETUPS</h3>
        <label class="mood-label" for="config-setups">SERVER LIBRARY</label>
        <div class="config-select-row"><select id="config-setups"><option value="">Choose a setup…</option></select><button class="mini-button" data-action="refresh" type="button">REFRESH</button></div>
        <label class="mood-label" for="config-name">SETUP NAME</label><input id="config-name" type="text" maxlength="100" placeholder="My museum soundscape" autocomplete="off" />
        <div class="config-actions"><button class="toolbar-button primary" data-action="save" type="button">SAVE NEW</button><button class="toolbar-button" data-action="update" type="button">UPDATE SELECTED</button><button class="toolbar-button primary" data-action="load" type="button">LOAD SELECTED</button></div>
        <p class="config-help">Saves the patch, samples, LFOs, layout, mood, prompts, and model choices on the server.</p>
      </section>
      <section class="config-section"><h3>STARTUP SETUP</h3><p class="config-default"></p>
        <div class="config-actions"><button class="toolbar-button" data-action="default" type="button">USE SELECTED AT STARTUP</button><button class="toolbar-button" data-action="clear-default" type="button">USE BUILT-IN STARTUP</button></div>
        <p class="config-help">The startup setup loads with audio paused. Loading a setup here restores its saved playback state.</p>
      </section>
      <section class="config-section"><h3>OPENAI MODELS</h3><div class="model-settings-grid">
        <label class="mood-label" for="config-text-model">MOOD & SYNTH PARAMETERS<select id="config-text-model" class="model-select">${modelOptions}</select></label>
        <label class="mood-label" for="config-image-model">PAINTING INTERPRETATION<select id="config-image-model" class="model-select">${modelOptions}</select></label>
      </div><p class="config-help">Applies to the next composition. Save or update a setup to keep these choices.</p></section>
      <div class="config-status" role="status">Connecting to the setup library…</div>
    </div>`;
  const query = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const selected = query<HTMLSelectElement>('#config-setups');
  const name = query<HTMLInputElement>('#config-name');
  const textModel = query<HTMLSelectElement>('#config-text-model');
  const imageModel = query<HTMLSelectElement>('#config-image-model');
  // Carry over choices made in the former Mood panel. New persistence is in setups.
  try {
    const previous = JSON.parse(localStorage.getItem('granularcube.openai-models.v1') ?? '{}');
    if (isOpenAIModel(previous?.text)) textModel.value = previous.text;
    if (isOpenAIModel(previous?.image)) imageModel.value = previous.image;
  } catch { /* Unavailable or invalid older preferences use the current defaults. */ }
  const status = query<HTMLElement>('.config-status');
  let summaries: SetupSummary[] = [];
  let defaultId: string | null = null;
  let busy = false;

  function setStatus(message: string, error = false): void { status.textContent = message; status.classList.toggle('error', error); }
  function updateControls(): void {
    for (const control of Array.from(root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select'))) {
      if (control.classList.contains('config-close')) continue;
      control.disabled = busy;
    }
    for (const action of ['update', 'load', 'default']) query<HTMLButtonElement>(`[data-action="${action}"]`).disabled = busy || !selected.value;
    query<HTMLButtonElement>('[data-action="clear-default"]').disabled = busy || !defaultId;
    query<HTMLElement>('.config-default').textContent = defaultId
      ? `Startup: ${summaries.find((item) => item.id === defaultId)?.name ?? 'Saved setup unavailable'}`
      : 'Startup: built-in patch';
  }
  async function refresh(preferredId = selected.value): Promise<void> {
    const result = await listSetups(); summaries = result.setups; defaultId = result.defaultId;
    selected.replaceChildren(new Option('Choose a setup…', ''), ...summaries.map((item) => new Option(`${item.name}${item.id === defaultId ? ' · startup' : ''}`, item.id)));
    if (summaries.some((item) => item.id === preferredId)) selected.value = preferredId;
    updateControls();
  }
  async function work(message: string, action: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true; updateControls(); setStatus(message);
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error), true); }
    finally { busy = false; updateControls(); }
  }
  selected.addEventListener('change', () => { name.value = summaries.find((item) => item.id === selected.value)?.name ?? ''; updateControls(); });
  const actions: Record<string, () => Promise<void>> = {
    refresh: () => work('Refreshing setups…', async () => { await refresh(); setStatus(`${summaries.length} saved setup${summaries.length === 1 ? '' : 's'}.`); }),
    save: () => store(false), update: () => store(true),
    load: () => work('Preparing saved samples…', async () => {
      const saved = await readSetup(selected.value); validateSetup(saved.setup);
      await apply(saved.setup, true); controller.applyModels(saved.setup.models); name.value = saved.name;
      setStatus(`Loaded “${saved.name}”.`);
    }),
    default: () => work('Saving startup choice…', async () => {
      await setDefaultSetup(selected.value); await refresh(); setStatus('Selected setup will load at startup.');
    }),
    'clear-default': () => work('Restoring built-in startup…', async () => {
      await setDefaultSetup(null); await refresh(); setStatus('Built-in patch will load at startup.');
    }),
  };
  function store(update: boolean): Promise<void> {
    return work('Saving setup and audio on the server…', async () => {
      const setupName = name.value.trim();
      if (!setupName) throw new Error('Enter a setup name first.');
      const setup = capture(); validateSetup(setup);
      const saved = await saveSetup(setupName, setup, update ? selected.value : undefined);
      await refresh(saved.id); name.value = saved.name;
      setStatus(`${update ? 'Updated' : 'Saved'} “${saved.name}” on the server.`);
    });
  }
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action]'))) button.addEventListener('click', () => { void actions[button.dataset.action!](); });
  query<HTMLButtonElement>('.config-close').addEventListener('click', () => {
    const dock = root.closest<HTMLElement>('.config-dock'); if (dock) dock.hidden = true;
    const button = document.querySelector<HTMLButtonElement>('#show-config');
    button?.setAttribute('aria-expanded', 'false'); button?.focus();
  });
  const controller: ConfigController = {
    root,
    getModels: () => ({ text: textModel.value, image: imageModel.value } as ModelSelection),
    applyModels(models) { textModel.value = models.text; imageModel.value = models.image; },
    initialize: () => work('Connecting to the setup library…', async () => {
      await refresh();
      if (defaultId) {
        const saved = await readSetup(defaultId); validateSetup(saved.setup);
        await apply(saved.setup, false); controller.applyModels(saved.setup.models);
        selected.value = saved.id; name.value = saved.name;
        setStatus(`Startup setup “${saved.name}” loaded. Audio is paused.`);
      } else setStatus(`${summaries.length} saved setup${summaries.length === 1 ? '' : 's'}. Save a patch to start experimenting.`);
    }),
  };
  updateControls();
  return controller;
}
