import { GranularEngine } from '../audio/GranularEngine';
import { granularControlGroups, type Parameters } from '../parameters';
import type { GranularSnapshot } from '../ai/PatchPlan';
import { sampleCatalog } from '../sampleCatalog';
import { requestSoundEffect, SFX_URL } from '../ai/SfxClient';
import { createRangeControl, type RangeControl } from './RangeControl';

function formatValue(value: number, unit = ''): string {
  const display = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${display}${unit ? ` ${unit}` : ''}`;
}

export interface GranularPanel {
  kind: 'granular';
  root: HTMLElement;
  outputPort: HTMLElement;
  label: string;
  engine: GranularEngine;
  getSnapshot(): GranularSnapshot;
  applySample(sample: string, blendSeconds?: number): Promise<boolean>;
  applyGeneratedSample(keyword: string, audioUrl: string, blendSeconds?: number): Promise<boolean>;
  applyParameters(parameters: Parameters): void;
  start(): Promise<void>;
  stop(): void;
}

export function createGranularPanel(
  id: number,
  engine: GranularEngine,
  onRemove: (id: number) => void,
  onStateChange: () => void,
  onManualSampleRequest: () => void,
): GranularPanel {
  const label = `GRAIN ${String(id).padStart(2, '0')}`;
  const root = document.createElement('article');
  root.className = 'module-card';
  root.dataset.moduleId = String(id);
  root.innerHTML = `
    <div class="module-head">
      <div class="module-identity"><span class="module-icon">▦</span><div><span class="module-kicker">SYNTH / ${label}</span><h2>granular~</h2></div></div>
      <div class="module-actions"><span class="module-led" aria-hidden="true"></span><button class="icon-button remove-button" type="button" title="Remove ${label}" aria-label="Remove ${label}">×</button></div>
    </div>
    <div class="module-flow"><span class="port input-port"></span><span>buffer~</span><span class="flow-arrow">→</span><span>poly~ ×64</span><span class="flow-arrow">→</span><span>filter~</span><span class="flow-arrow">→</span><span>cloud~</span><span class="port output-port" title="Audio output"></span></div>
    <div class="module-section sample-section">
      <div class="section-title"><span>01</span> SAMPLE SOURCE</div>
      <div class="sample-line"><select class="sample-select" aria-label="${label} sample">${sampleCatalog.map(({ label: name, file }) => `<option value="${file}">${name}</option>`).join('')}</select><button class="mini-button browse-button" type="button" title="Open audio file">OPEN…</button><input class="file-input" type="file" accept="audio/*,.wav,.aiff,.aif,.mp3,.m4a" hidden /></div>
      <details class="url-details"><summary>LOAD FROM URL</summary><div class="url-line"><input class="url-input" type="url" placeholder="https://…/sample.wav" aria-label="${label} sample URL" /><button class="mini-button url-button" type="button">LOAD</button></div></details>
      <form class="sfx-generator"><label for="sfx-word-${id}">AI SAMPLE / ELEVENLABS</label><div class="sfx-line"><input id="sfx-word-${id}" class="sfx-word" type="text" maxlength="80" placeholder="One word, e.g. rain" aria-label="${label} sound word" /><button class="mini-button sfx-button" type="submit">GENERATE</button></div><div class="sfx-status" role="status">Enter a word to create a sample.</div><div class="sfx-endpoint">POST ${SFX_URL}</div></form>
      <div class="sample-readout"><span class="sample-name">—</span><span class="sample-duration">—</span></div>
    </div>
    <div class="module-section transport-section"><button class="module-play" type="button" disabled>▶ <span>LOADING</span></button><span class="module-status" role="status">Preparing sample…</span></div>
    <div class="module-controls"></div>
    <div class="module-foot"><span>OUT L / R</span><span>→ MASTER BUS</span></div>
  `;

  const outputPort = root.querySelector<HTMLElement>('.output-port')!;
  const status = root.querySelector<HTMLElement>('.module-status')!;
  const playButton = root.querySelector<HTMLButtonElement>('.module-play')!;
  const led = root.querySelector<HTMLElement>('.module-led')!;
  const sampleSelect = root.querySelector<HTMLSelectElement>('.sample-select')!;
  const sampleName = root.querySelector<HTMLElement>('.sample-name')!;
  const sampleDuration = root.querySelector<HTMLElement>('.sample-duration')!;
  const fileInput = root.querySelector<HTMLInputElement>('.file-input')!;
  const sfxForm = root.querySelector<HTMLFormElement>('.sfx-generator')!;
  const sfxWord = root.querySelector<HTMLInputElement>('.sfx-word')!;
  const sfxButton = root.querySelector<HTMLButtonElement>('.sfx-button')!;
  const sfxStatus = root.querySelector<HTMLElement>('.sfx-status')!;
  const controls = root.querySelector<HTMLElement>('.module-controls')!;
  let loadToken = 0;
  let currentSample = '';
  let customOption: HTMLOptionElement | null = null;
  let selectionRange: RangeControl | null = null;
  const rangeControls = new Map<string, RangeControl>();

  function setStatus(message: string, error = false): void {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function showSampleSelection(name: string): void {
    if (sampleCatalog.some(({ file }) => file === name)) {
      customOption?.remove();
      customOption = null;
      sampleSelect.value = name;
      return;
    }
    if (!customOption) {
      customOption = document.createElement('option');
      customOption.value = '__custom_sample__';
      customOption.disabled = true;
      sampleSelect.prepend(customOption);
    }
    customOption.textContent = name;
    sampleSelect.value = customOption.value;
  }

  function updatePlayState(): void {
    playButton.innerHTML = engine.isPlaying ? '■ <span>STOP</span>' : '▶ <span>PLAY</span>';
    playButton.classList.toggle('active', engine.isPlaying);
    led.classList.toggle('active', engine.isPlaying);
    onStateChange();
  }

  function updateSelection(durationMs: number): void {
    selectionRange?.setBounds(0, Math.ceil(durationMs));
    selectionRange?.setValues(engine.currentParameters.selectionStart, engine.currentParameters.selectionEnd);
    sampleDuration.textContent = `${(durationMs / 1000).toFixed(1)} s`;
  }

  async function loadSample(name: string, loader: () => Promise<number>): Promise<boolean> {
    const token = ++loadToken;
    setStatus(`Loading ${name}…`);
    try {
      const durationMs = await loader();
      if (token !== loadToken) return false;
      currentSample = name;
      sampleName.textContent = name;
      showSampleSelection(name);
      updateSelection(durationMs);
      playButton.disabled = false;
      updatePlayState();
      setStatus(engine.isPlaying ? 'Running' : 'Ready');
      return true;
    } catch (error) {
      if (token !== loadToken) return false;
      if (currentSample) showSampleSelection(currentSample);
      setStatus(error instanceof Error ? error.message : 'Sample failed', true);
      return false;
    }
  }

  for (const [groupIndex, group] of granularControlGroups.entries()) {
    const block = document.createElement('section');
    block.className = 'parameter-block';
    block.innerHTML = `<div class="section-title"><span>${String(groupIndex + 2).padStart(2, '0')}</span> ${group.title.toUpperCase()}</div><div class="parameter-grid"></div>`;
    const grid = block.querySelector<HTMLElement>('.parameter-grid')!;
    if (group.filterSelect) {
      const row = document.createElement('label');
      row.className = 'control select-control';
      row.innerHTML = '<span class="control-label">FILTER MODE</span><select class="filter-select"><option value="lowpass">LOWPASS</option><option value="highpass">HIGHPASS</option><option value="bandpass">BANDPASS</option><option value="notch">NOTCH</option></select>';
      row.querySelector<HTMLSelectElement>('select')!.addEventListener('change', (event) => {
        engine.setParameter('filterType', (event.currentTarget as HTMLSelectElement).value as Parameters['filterType']);
      });
      grid.append(row);
    }
    for (const definition of group.controls) {
      if (definition.kind === 'range') {
        const range = createRangeControl(
          definition,
          label,
          engine.currentParameters[definition.keys[0]],
          engine.currentParameters[definition.keys[1]],
          (lower, upper) => {
            engine.setParameter(definition.keys[0], lower);
            engine.setParameter(definition.keys[1], upper);
          },
        );
        if (definition.keys[0] === 'selectionStart') selectionRange = range;
        rangeControls.set(definition.keys[0], range);
        grid.append(range.root);
        continue;
      }
      const row = document.createElement('label');
      row.className = 'control';
      row.innerHTML = `<span class="control-heading"><span class="control-label">${definition.label.toUpperCase()}</span><output>${formatValue(engine.currentParameters[definition.key], definition.unit)}</output></span><input aria-label="${label} ${definition.label}" data-param="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${engine.currentParameters[definition.key]}" />`;
      const input = row.querySelector<HTMLInputElement>('input')!;
      const output = row.querySelector<HTMLOutputElement>('output')!;
      input.addEventListener('input', () => {
        const value = Number(input.value);
        engine.setParameter(definition.key, value);
        output.value = formatValue(value, definition.unit);
      });
      grid.append(row);
    }
    controls.append(block);
  }

  async function start(): Promise<void> {
    await engine.start();
    updatePlayState();
    setStatus('Running');
  }

  playButton.addEventListener('click', async () => {
    if (engine.isPlaying) {
      engine.stop();
      updatePlayState();
      setStatus('Stopped');
      return;
    }
    try {
      await start();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Audio failed', true);
    }
  });

  root.querySelector<HTMLButtonElement>('.remove-button')!.addEventListener('click', () => onRemove(id));
  root.querySelector<HTMLButtonElement>('.browse-button')!.addEventListener('click', () => fileInput.click());
  sampleSelect.addEventListener('change', () => {
    onManualSampleRequest();
    const file = sampleSelect.value;
    void loadSample(file, () => engine.loadSample(`/${encodeURIComponent(file)}`));
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      onManualSampleRequest();
      void loadSample(file.name, () => engine.loadFile(file));
    }
  });
  root.querySelector<HTMLButtonElement>('.url-button')!.addEventListener('click', () => {
    try {
      const url = new URL(root.querySelector<HTMLInputElement>('.url-input')!.value.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS URL');
      onManualSampleRequest();
      void loadSample(url.pathname.split('/').pop() || url.hostname, () => engine.loadSample(url.href));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Invalid URL', true);
    }
  });
  sfxForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const word = sfxWord.value.trim();
    if (!word) {
      sfxStatus.textContent = 'Enter a word first.';
      sfxStatus.classList.add('error');
      sfxWord.focus();
      return;
    }
    onManualSampleRequest();
    const priorLoad = loadToken;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 120_000);
    sfxButton.disabled = true;
    sfxWord.disabled = true;
    sfxStatus.classList.remove('error');
    sfxStatus.textContent = `Generating “${word}”…`;
    try {
      const generated = await requestSoundEffect(word, abort.signal);
      if (priorLoad !== loadToken || !root.isConnected) throw new Error('The module sample changed while generating. Try again.');
      sfxStatus.textContent = `Loading ${generated.filename}…`;
      const loaded = await loadSample(`AI · ${word}`, () => engine.loadSample(generated.audioUrl));
      if (!loaded) throw new Error('Could not load the generated audio.');
      sfxStatus.textContent = `Loaded “${word}” as the granular sample.`;
    } catch (error) {
      sfxStatus.classList.add('error');
      sfxStatus.textContent = error instanceof DOMException && error.name === 'AbortError'
        ? 'Sound generation timed out.'
        : error instanceof Error && error.message === 'Failed to fetch'
          ? `Could not reach ${SFX_URL}.`
          : error instanceof Error ? error.message : 'Sound generation failed.';
    } finally {
      window.clearTimeout(timeout);
      sfxButton.disabled = false;
      sfxWord.disabled = false;
    }
  });

  const initialSample = sampleCatalog[(id - 1) % sampleCatalog.length].file;
  sampleSelect.value = initialSample;
  void loadSample(initialSample, () => engine.loadSample(`/${encodeURIComponent(initialSample)}`));

  return {
    kind: 'granular',
    root,
    outputPort,
    label,
    engine,
    getSnapshot() {
      return {
        id,
        type: 'granular',
        label,
        playing: engine.isPlaying,
        sample: currentSample || sampleSelect.value,
        sampleDurationMs: engine.sampleDurationMs,
        parameters: engine.currentParameters,
      };
    },
    async applySample(sample, blendSeconds) {
      if (sample === currentSample && engine.sampleDurationMs > 0) return false;
      if (!sampleCatalog.some(({ file }) => file === sample)) throw new Error(`${label}: unknown sample ${sample}`);
      const loaded = await loadSample(sample, () => engine.loadSample(`/${encodeURIComponent(sample)}`, blendSeconds));
      if (!loaded) throw new Error(`${label}: could not load ${sample}`);
      return true;
    },
    async applyGeneratedSample(keyword, audioUrl, blendSeconds) {
      const loaded = await loadSample(`AI · ${keyword}`, () => engine.loadSample(audioUrl, blendSeconds));
      if (!loaded) throw new Error(`${label}: could not load generated sound for “${keyword}”`);
      sfxWord.value = keyword;
      sfxStatus.classList.remove('error');
      sfxStatus.textContent = `Loaded “${keyword}” from the image.`;
      return true;
    },
    applyParameters(parameters) {
      for (const group of granularControlGroups) {
        for (const definition of group.controls) {
          if (definition.kind === 'range') {
            const range = rangeControls.get(definition.keys[0])!;
            range.setValues(parameters[definition.keys[0]], parameters[definition.keys[1]]);
            const [lower, upper] = range.getValues();
            engine.setParameter(definition.keys[0], lower);
            engine.setParameter(definition.keys[1], upper);
          } else {
            const input = controls.querySelector<HTMLInputElement>(`[data-param="${definition.key}"]`)!;
            input.value = String(parameters[definition.key]);
            const value = Number(input.value);
            engine.setParameter(definition.key, value);
            input.closest('.control')!.querySelector<HTMLOutputElement>('output')!.value = formatValue(value, definition.unit);
          }
        }
      }
      const filterSelect = controls.querySelector<HTMLSelectElement>('.filter-select')!;
      filterSelect.value = parameters.filterType;
      engine.setParameter('filterType', parameters.filterType);
    },
    start,
    stop() {
      engine.stop();
      updatePlayState();
      setStatus('Stopped');
    },
  };
}
