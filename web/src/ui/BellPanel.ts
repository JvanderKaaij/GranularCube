import { BellEngine } from '../audio/BellEngine';
import type { BellSnapshot } from '../ai/PatchPlan';
import { bellControlGroups, type BellParameters } from '../parameters';

type BellParameter = keyof BellParameters;

function noteName(note: number): string {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}

function formatValue(key: BellParameter, value: number, unit = ''): string {
  if (key === 'rootNote') return noteName(value);
  return `${Number(value.toFixed(2))}${unit ? ` ${unit}` : ''}`;
}

export interface BellPanel {
  kind: 'bell';
  root: HTMLElement;
  outputPort: HTMLElement;
  label: string;
  engine: BellEngine;
  getSnapshot(): BellSnapshot;
  applyParameters(parameters: BellParameters): void;
  applySequence(sequence: number[]): void;
  start(): Promise<void>;
  stop(): void;
}

export function createBellPanel(
  id: number,
  engine: BellEngine,
  onRemove: (id: number) => void,
  onStateChange: () => void,
): BellPanel {
  const label = `BELL ${String(id).padStart(2, '0')}`;
  const root = document.createElement('article');
  root.className = 'module-card bell-card';
  root.dataset.moduleId = String(id);
  root.innerHTML = `
    <div class="module-head">
      <div class="module-identity"><span class="module-icon">◌</span><div><span class="module-kicker">INSTRUMENT / ${label}</span><h2>bell~</h2></div></div>
      <div class="module-actions"><span class="module-led" aria-hidden="true"></span><button class="icon-button remove-button" type="button" title="Remove ${label}" aria-label="Remove ${label}">×</button></div>
    </div>
    <div class="module-flow"><span class="port input-port"></span><span>mallet~ + noise~</span><span class="flow-arrow">→</span><span>modes~ ×7</span><span class="flow-arrow">→</span><span>cloud~</span><span class="port output-port" title="Audio output"></span></div>
    <div class="module-section bell-source"><div class="section-title"><span>01</span> MODAL RESONATOR</div><p>Shape the strike noise, hit position, partial tuning, damping, and body resonance. The sequence follows the selected root.</p><div class="bell-sequence"><span>NOTE SEQUENCE</span><output class="bell-sequence-notes"></output></div></div>
    <div class="module-section transport-section"><button class="module-play" type="button">▶ <span>PLAY</span></button><button class="module-strike" type="button" aria-label="Strike ${label} once">STRIKE</button><span class="module-status" role="status">Ready</span></div>
    <div class="module-controls"></div>
    <div class="module-foot"><span>OUT L / R</span><span>→ MASTER BUS</span></div>
  `;

  const outputPort = root.querySelector<HTMLElement>('.output-port')!;
  const status = root.querySelector<HTMLElement>('.module-status')!;
  const playButton = root.querySelector<HTMLButtonElement>('.module-play')!;
  const led = root.querySelector<HTMLElement>('.module-led')!;
  const controls = root.querySelector<HTMLElement>('.module-controls')!;
  const sequenceNotes = root.querySelector<HTMLOutputElement>('.bell-sequence-notes')!;

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

  for (const [groupIndex, group] of bellControlGroups.entries()) {
    const block = document.createElement('section');
    block.className = 'parameter-block';
    block.innerHTML = `<div class="section-title"><span>${String(groupIndex + 2).padStart(2, '0')}</span> ${group.title.toUpperCase()}</div><div class="parameter-grid"></div>`;
    const grid = block.querySelector<HTMLElement>('.parameter-grid')!;
    for (const definition of group.controls) {
      const row = document.createElement('label');
      row.className = 'control';
      const initial = engine.currentParameters[definition.key];
      row.innerHTML = `<span class="control-heading"><span class="control-label">${definition.label.toUpperCase()}</span><output>${formatValue(definition.key, initial, definition.unit)}</output></span><input data-param="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${initial}" aria-label="${label} ${definition.label}" />`;
      const input = row.querySelector<HTMLInputElement>('input')!;
      const output = row.querySelector<HTMLOutputElement>('output')!;
      input.addEventListener('input', () => {
        const value = Number(input.value);
        engine.setParameter(definition.key, value);
        output.value = formatValue(definition.key, value, definition.unit);
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
    kind: 'bell',
    root,
    outputPort,
    label,
    engine,
    getSnapshot() {
      return { id, type: 'bell', label, playing: engine.isPlaying, parameters: engine.currentParameters, sequence: engine.currentSequence };
    },
    applyParameters(parameters) {
      for (const group of bellControlGroups) {
        for (const definition of group.controls) {
          const input = controls.querySelector<HTMLInputElement>(`[data-param="${definition.key}"]`)!;
          input.value = String(parameters[definition.key]);
          const value = Number(input.value);
          engine.setParameter(definition.key, value);
          input.closest('.control')!.querySelector<HTMLOutputElement>('output')!.value = formatValue(definition.key, value, definition.unit);
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
