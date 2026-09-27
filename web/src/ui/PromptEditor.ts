import { BRIEF_SYSTEM, PARAMETER_SYSTEM, SFX_PROMPT_TEMPLATE, validateSfxTemplate } from '../ai/Composition';

export interface PromptSettings { briefSystem: string; parameterSystem: string; sfxTemplate: string }
export interface PromptEditor {
  root: HTMLElement;
  getSettings(): PromptSettings;
  applySettings(settings: PromptSettings): void;
  beginRun(): void;
  recordRequest(title: string, prompt: string, system?: string): void;
}

const STORAGE_KEY = 'granularcube.prompt-overrides.v1';
const defaults: PromptSettings = { briefSystem: BRIEF_SYSTEM, parameterSystem: PARAMETER_SYSTEM, sfxTemplate: SFX_PROMPT_TEMPLATE };
const definitions: { key: keyof PromptSettings; label: string; hint: string; rows: number }[] = [
  { key: 'briefSystem', label: 'PAINTING / MOOD BRIEF · SYSTEM INSTRUCTIONS', rows: 12,
    hint: 'Controls painting interpretation, mood, era, instrument roles and the audible artwork source.' },
  { key: 'parameterSystem', label: 'SYNTH PARAMETERS & NOTES · SYSTEM INSTRUCTIONS', rows: 12,
    hint: 'Controls how the brief becomes filters, grains, physical modes, note sequences and effects.' },
  { key: 'sfxTemplate', label: 'ELEVENLABS · SOUND DESCRIPTION TEMPLATE', rows: 3,
    hint: 'Use {source}, {action}, and {character} from the artwork brief. The expanded description must fit 450 characters.' },
];

// Retire exact passages from earlier built-in prompts when they remain in a saved
// override. These old strings are migration matches; they are never new model guidance.
const retiredGuidance: [string, string][] = [
  ['First choose something depicted (water lapping, leaves rustling, an animal calling).',
    'Choose the strongest physical sound-producing source supported by visible evidence in the artwork.'],
  ['For a still scene, use a plausible action of visible material or implied environment (fabric gently rustling on a dressed figure, a soft breeze through a landscape).',
    'For a still scene, infer a plausible audible action from the visible material, mechanism, or setting.'],
  ['Prefer gentle natural motion or evolving material texture suitable for an atmospheric bed over dramatic cinematic hits.',
    'Choose the source from the artwork, then adapt its intensity, pace and recording character to suit an atmospheric composition.'],
  ['Do not turn canvas into rustling simply because it is a painting.',
    "The painting's support medium is not an automatic sound source."],
  ['Schema example values are placeholders, not a suggested soundscape.',
    'The outputSchema describes types and constraints only; compose the actual values from the current brief.'],
  ['The response skeleton deliberately has an empty sequence; replace it with 4–16 composed integer offsets. Never return that empty skeleton or copy the active pattern.',
    'Compose 4–16 integer offsets using the supplied limits. Do not copy the active pattern.'],
  ['Return the requested schema exactly.', 'Return composed values in the structure defined by outputSchema.'],
  ['Work from each voice\'s role and sonic evidence. A bed needs sustained overlap and modest level; a texture supplies restrained variation; a focal source must retain identity; an accent leaves room. Coordinate grain length and targetOverlap rather than independently guessing density. Density is derived locally from targetOverlap / mean grain length in seconds. Requested overlap is 0.05–8. Use differences in grain duration, envelope range, filter bandwidth and wetness to separate roles.',
    'Keep every source clearly audible in the mix. As a starting point, use module output gain around 0.45–0.75 for beds and textures, 0.55–0.85 for focal voices, and 0.35–0.65 for accents, within the supplied range. Raise a quiet source’s module gain before making its other parameters extreme; preserve role contrast and reduce level only when overlap or combined sources make the mix crowded.'],
  ['Amp range is per grain; overlapping grains add energy. Never compensate for excessive overlap by raising gain.',
    'Amp range is per grain; overlapping grains add energy, so keep overlap intentional, but do not default every module to a quiet level.'],
  ['The master gain and module gain are ceilings, not targets to maximize.',
    'Keep master headroom, while using the module-gain ranges above to make sources clearly audible.'],
  ['Piano_sampler voices use a bank of individually recorded piano keys.',
    'Piano_sampler voices use recorded piano samples mapped across playable keys, including SFZ zones with automatic transposition.'],
  ['Piano_sampler instruments play occasional chord gestures from exact recorded keys.',
    'Piano_sampler instruments play occasional chord gestures using the playable keyboard in controls.pianoGestures.'],
  ['with pauses of roughly 20–60 seconds and quiet but audible velocities.',
    'with pauses within 6–30 seconds and quiet but audible velocities. Both gap controls must be within 6–30 seconds, with gapMinSeconds <= gapMaxSeconds.'],
  ['A sample cannot sustain beyond its recording; no transposition, sample looping, or invented keys.',
    'Every available key is playable: the sampler automatically transposes its mapped recording from the SFZ root pitch. canSustain keys loop through hold and release; other keys decay naturally and end at the recording boundary. Compose desired sounding MIDI notes, without limiting harmony to recorded roots.'],
];

function migrateGuidance(value: string): string {
  for (const [oldText, newText] of retiredGuidance) value = value.split(oldText).join(newText);
  return value;
}

export function createPromptEditor(): PromptEditor {
  const root = document.createElement('div');
  root.className = 'prompt-tools';
  root.innerHTML = `
    <details class="mood-details prompt-editor"><summary>PROMPTS · EDIT & EXPERIMENT</summary>
      <p class="prompt-hint">Edits apply to the next composition. JSON validation and atmospheric limits still apply; PIPELINE DEBUG shows any adjustments.</p>
      <div class="prompt-fields"></div>
      <div class="prompt-actions"><button class="mini-button prompt-reset-all" type="button">RESET ALL PROMPTS</button></div>
      <p class="prompt-save-status" role="status"></p>
    </details>
    <details class="mood-details sent-prompts"><summary>PROMPTS · LAST COMPOSITION REQUESTS</summary>
      <p class="prompt-hint">Exact system instructions and request text, including generated patch context and correction requests. Image bytes are omitted.</p>
      <div class="prompt-transcript"><p class="prompt-hint">No composition requested yet.</p></div>
      <p class="prompt-copy-status" role="status"></p>
    </details>`;
  const inputs = new Map<keyof PromptSettings, HTMLTextAreaElement>();
  const saveStatus = root.querySelector<HTMLElement>('.prompt-save-status')!;
  const copyStatus = root.querySelector<HTMLElement>('.prompt-copy-status')!;
  const fields = root.querySelector<HTMLElement>('.prompt-fields')!;
  const transcript = root.querySelector<HTMLElement>('.prompt-transcript')!;
  let settings: PromptSettings = { ...defaults };
  let storedOverrides: Partial<PromptSettings> = {};
  let storageAvailable = true;
  let migrated = false;
  let storedText = '{}';
  try { storedText = localStorage.getItem(STORAGE_KEY) ?? '{}'; }
  catch { storageAvailable = false; }
  try {
    const value: unknown = JSON.parse(storedText);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const { key } of definitions) {
        const saved = (value as Record<string, unknown>)[key];
        if (typeof saved === 'string') {
          let updated = saved;
          if (key !== 'sfxTemplate') updated = migrateGuidance(saved);
          storedOverrides[key] = updated;
          if (updated !== saved) migrated = true;
        }
      }
    }
  } catch { /* A malformed saved value uses the current defaults. */ }
  settings = { ...defaults, ...storedOverrides };
  if (migrated) {
    const notice = document.createElement('p'); notice.className = 'prompt-hint';
    notice.textContent = 'Updated older built-in example passages in your saved prompts. Review the edited instructions below.';
    root.querySelector('.prompt-editor')!.insertBefore(notice, fields);
  }

  function renderSaveStatus(): void {
    const customized = definitions.filter(({ key }) => settings[key] !== defaults[key]).length;
    saveStatus.textContent = `${customized ? `${customized} custom prompt${customized === 1 ? '' : 's'}` : 'Using default prompts'}. ` +
      (storageAvailable ? 'Saved in this browser; edits apply on the next composition.' : 'Edits apply on the next composition; browser storage is unavailable.');
  }
  function persist(): void {
    const overrides = Object.fromEntries(definitions.filter(({ key }) => settings[key] !== defaults[key]).map(({ key }) => [key, settings[key]]));
    try {
      if (Object.keys(overrides).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      else localStorage.removeItem(STORAGE_KEY);
      storageAvailable = true;
    } catch { storageAvailable = false; }
    renderSaveStatus();
  }
  for (const definition of definitions) {
    const field = document.createElement('div');
    field.className = 'prompt-field';
    const heading = document.createElement('div');
    heading.className = 'prompt-field-heading';
    const label = document.createElement('label');
    label.className = 'mood-label';
    label.htmlFor = `prompt-editor-${definition.key}`;
    label.textContent = definition.label;
    const reset = document.createElement('button');
    reset.className = 'mini-button'; reset.type = 'button'; reset.textContent = 'RESET';
    reset.setAttribute('aria-label', `Reset ${definition.label.toLowerCase()}`);
    const input = document.createElement('textarea');
    input.id = label.htmlFor; input.className = 'prompt-text'; input.rows = definition.rows;
    input.spellcheck = false; input.value = settings[definition.key];
    const hint = document.createElement('p'); hint.className = 'prompt-hint'; hint.textContent = definition.hint;
    hint.id = `${input.id}-hint`; input.setAttribute('aria-describedby', hint.id);
    input.addEventListener('input', () => { settings[definition.key] = input.value; persist(); });
    reset.addEventListener('click', () => { settings[definition.key] = defaults[definition.key]; input.value = settings[definition.key]; persist(); });
    heading.append(label, reset); field.append(heading, input, hint); fields.append(field);
    inputs.set(definition.key, input);
  }
  root.querySelector('.prompt-reset-all')!.addEventListener('click', () => {
    settings = { ...defaults };
    for (const [key, input] of inputs) input.value = settings[key];
    persist();
  });
  if (migrated) persist(); else renderSaveStatus();

  return {
    root,
    applySettings(saved) {
      validateSfxTemplate(saved.sfxTemplate);
      settings = { ...saved, briefSystem: migrateGuidance(saved.briefSystem), parameterSystem: migrateGuidance(saved.parameterSystem) };
      for (const [key, input] of inputs) input.value = settings[key];
      transcript.replaceChildren(); copyStatus.textContent = '';
      saveStatus.textContent = 'Prompts loaded from the server setup. Save the setup to keep further changes.';
    },
    getSettings() {
      if (!settings.briefSystem.trim()) throw new Error('Enter brief instructions or reset that prompt.');
      if (!settings.parameterSystem.trim()) throw new Error('Enter parameter instructions or reset that prompt.');
      validateSfxTemplate(settings.sfxTemplate);
      return { ...settings };
    },
    beginRun() { transcript.replaceChildren(); copyStatus.textContent = ''; },
    recordRequest(title, prompt, system) {
      const entry = document.createElement('details'); entry.className = 'sent-prompt-entry'; entry.open = true;
      const summary = document.createElement('summary'); summary.textContent = title; entry.append(summary);
      for (const [label, value] of [['SYSTEM INSTRUCTIONS', system], ['REQUEST', prompt]]) {
        if (value === undefined) continue;
        const heading = document.createElement('div'); heading.className = 'prompt-field-heading';
        const name = document.createElement('span'); name.className = 'mood-label'; name.textContent = label!;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'mini-button'; button.textContent = 'COPY';
        button.setAttribute('aria-label', `Copy ${title} ${label!.toLowerCase()}`);
        const text = document.createElement('pre'); text.className = 'sent-prompt-text'; text.textContent = value;
        button.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(value); copyStatus.textContent = `${title} ${label!.toLowerCase()} copied.`; }
          catch {
            const range = document.createRange(); range.selectNodeContents(text);
            const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
            copyStatus.textContent = 'Clipboard unavailable. Prompt text selected; use Ctrl+C to copy.';
          }
        });
        heading.append(name, button); entry.append(heading, text);
      }
      transcript.append(entry);
    },
  };
}
