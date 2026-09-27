import { PhysicalEngine } from '../audio/PhysicalEngine';
import type { PhysicalSnapshot } from '../ai/PatchPlan';
import { physicalSourceGroups, type PhysicalParameters } from '../parameters';
import { ParameterLfoControl } from './ParameterLfoControl';
import { createParameterLock } from './ParameterLock';
import type { ParameterLfoMap } from '../audio/ParameterLfo';
import { configureParameterSlider, readSliderValue, writeSliderValue } from './ParameterSlider';

type PhysicalParameter = keyof PhysicalParameters;

function noteName(note: number): string {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}

function formatValue(key: PhysicalParameter, value: number, unit = ''): string {
  if (key === 'rootNote') return noteName(value);
  return `${Number(value.toFixed(2))}${unit ? ` ${unit}` : ''}`;
}

export interface PhysicalPanel {
  kind: 'physical';
  root: HTMLElement;
  outputPort: HTMLElement;
  label: string;
  engine: PhysicalEngine;
  getSnapshot(): PhysicalSnapshot;
  applyParameters(parameters: PhysicalParameters): void;
  lfos: ParameterLfoMap;
  applyLfos(settings: ParameterLfoMap): void;
  applySequence(sequence: number[]): void;
  start(): Promise<void>;
  stop(): void;
}

export function createPhysicalPanel(
  id: number,
  engine: PhysicalEngine,
  onRemove: (id: number) => void,
  onStateChange: () => void,
): PhysicalPanel {
  const label = `PHYSICAL ${String(id).padStart(2, '0')}`;
  const root = document.createElement('article');
  root.className = 'module-card physical-card';
  root.dataset.moduleId = String(id);
  root.innerHTML = `
    <div class="module-head">
      <div class="module-identity"><span class="module-icon">◌</span><div><span class="module-kicker">INSTRUMENT / ${label}</span><h2>physical~</h2></div></div>
      <div class="module-actions"><span class="module-led" aria-hidden="true"></span><button class="icon-button remove-button" type="button" title="Remove ${label}" aria-label="Remove ${label}">×</button></div>
    </div>
    <div class="module-flow"><span>RESONATOR / STEREO</span><button type="button" class="port output-port" aria-label="Connect physical output">OUT</button></div>
    <div class="module-section physical-model"><label for="physical-model-${id}">RESONATOR MODEL</label><select id="physical-model-${id}" aria-label="${label} resonator model"><option value="bell">Bell</option><option value="percussion">Percussive body</option><option value="string">Plucked string</option></select><p class="physical-model-hint">Choose the resonator character. Connect a delay node for lingering melodic repeats.</p></div>
    <div class="module-section physical-source"><div class="section-title"><span>01</span> MODAL RESONATOR</div><p>Shape the strike noise, hit position, partial tuning, damping, and body resonance. The sequence follows the selected root.</p><div class="physical-sequence"><span>NOTE SEQUENCE</span><output class="physical-sequence-notes"></output></div></div>
    <div class="module-section transport-section"><button class="module-play" type="button">▶ <span>PLAY</span></button><button class="module-strike" type="button" aria-label="Strike ${label} once">STRIKE</button><span class="module-status" role="status">Ready</span></div>
    <div class="module-controls"></div>
    <div class="module-foot"><span>OUT L / R</span><span>DRY SOURCE</span></div>
  `;

  const outputPort = root.querySelector<HTMLElement>('.output-port')!;
  const status = root.querySelector<HTMLElement>('.module-status')!;
  const playButton = root.querySelector<HTMLButtonElement>('.module-play')!;
  const led = root.querySelector<HTMLElement>('.module-led')!;
  const controls = root.querySelector<HTMLElement>('.module-controls')!;
  const sequenceNotes = root.querySelector<HTMLOutputElement>('.physical-sequence-notes')!;
  const modelSelect = root.querySelector<HTMLSelectElement>('.physical-model select')!;
  const modelHeading = root.querySelector<HTMLElement>('.physical-model > label')!;
  const modelLockHost = document.createElement('span'); modelLockHost.className = 'parameter-lock-heading';
  modelHeading.replaceWith(modelLockHost); modelLockHost.append(modelHeading);
  createParameterLock(modelLockHost, 'model');
  const sequenceHeading = root.querySelector<HTMLElement>('.physical-sequence > span')!;
  sequenceHeading.classList.add('parameter-lock-heading'); createParameterLock(sequenceHeading, 'sequence');
  const lfos: ParameterLfoMap = {};
  const lfoByKey = new Map<string, ParameterLfoControl>();
  const syncLfos = () => engine.setParameterLfos(lfos);
  modelSelect.value = engine.currentParameters.model;
  modelSelect.addEventListener('change', () => {
    engine.setParameter('model', modelSelect.value as PhysicalParameters['model']);
  });

  function renderSequence(): void {
    const rootNote = engine.currentParameters.rootNote;
    sequenceNotes.value = engine.currentSequence.map((offset) => noteName(rootNote + offset)).join(' · ');
  }
  renderSequence();

  function setStatus(message: string, error = false): void {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function updatePlayState(): void {
    playButton.innerHTML = engine.isPlaying ? '■ <span>STOP</span>' : '▶ <span>PLAY</span>';
    playButton.classList.toggle('active', engine.isPlaying);
    led.classList.toggle('active', engine.isPlaying);
    onStateChange();
  }

  for (const [groupIndex, group] of physicalSourceGroups.entries()) {
    const block = document.createElement('section');
    block.className = 'parameter-block';
    block.innerHTML = `<div class="section-title"><span>${String(groupIndex + 3).padStart(2, '0')}</span> ${group.title.toUpperCase()}</div><div class="parameter-grid"></div>`;
    const grid = block.querySelector<HTMLElement>('.parameter-grid')!;
    for (const definition of group.controls) {
      const row = document.createElement('div');
      row.className = 'control';
      const initial = engine.currentParameters[definition.key];
      row.innerHTML = `<span class="control-heading"><span class="control-label">${definition.label.toUpperCase()}</span><output>${formatValue(definition.key, initial, definition.unit)}</output></span><input data-param="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${initial}" aria-label="${label} ${definition.label}" />`;
      const input = row.querySelector<HTMLInputElement>('input')!;
      configureParameterSlider(input, definition, initial);
      const output = row.querySelector<HTMLOutputElement>('output')!;
      lfoByKey.set(definition.key, new ParameterLfoControl(row.querySelector<HTMLElement>('.control-heading')!, definition.key, input, (settings) => { lfos[definition.key] = settings; syncLfos(); }, (value) => formatValue(definition.key, value, definition.unit)));
      input.addEventListener('input', () => {
        const value = readSliderValue(input);
        engine.setParameter(definition.key, value);
        writeSliderValue(input, engine.currentParameters[definition.key]);
        output.value = formatValue(definition.key, engine.currentParameters[definition.key], definition.unit);
        if (definition.key === 'rootNote') renderSequence();
      });
      grid.append(row);
    }
    controls.append(block);
  }

  async function start(): Promise<void> {
    await engine.start();
    updatePlayState();
    setStatus('Pattern running');
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
  root.querySelector<HTMLButtonElement>('.module-strike')!.addEventListener('click', async () => {
    try {
      await engine.strike();
      setStatus(engine.isPlaying ? 'Pattern running' : 'Single strike');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Audio failed', true);
    }
  });
  root.querySelector<HTMLButtonElement>('.remove-button')!.addEventListener('click', () => onRemove(id));

  return {
    kind: 'physical',
    root,
    outputPort,
    label,
    engine,
    lfos,
    applyLfos(settings) { for (const [key, settingsForKey] of Object.entries(settings)) lfoByKey.get(key)?.applySettings(settingsForKey); },
    getSnapshot() {
      return { id, type: 'physical', label, playing: engine.isPlaying, parameters: engine.currentParameters, sequence: engine.currentSequence };
    },
    applyParameters(parameters) {
      modelSelect.value = parameters.model;
      engine.setParameter('model', parameters.model);
      for (const group of physicalSourceGroups) {
        for (const definition of group.controls) {
          const input = controls.querySelector<HTMLInputElement>(`[data-param="${definition.key}"]`)!;
          engine.setParameter(definition.key, parameters[definition.key]);
          const value = engine.currentParameters[definition.key];
          lfoByKey.get(definition.key)?.setBase(value);
          writeSliderValue(input, value);
          input.closest('.control')!.querySelector<HTMLOutputElement>('output')!.value = formatValue(definition.key, engine.currentParameters[definition.key], definition.unit);
        }
      }
      renderSequence();
    },
    applySequence(sequence) {
      engine.setSequence(sequence);
      renderSequence();
    },
    start,
    stop() {
      engine.stop();
      updatePlayState();
      setStatus('Stopped');
    },
  };
}
