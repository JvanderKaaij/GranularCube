import './style.css';
import { AudioRack } from './audio/AudioRack';
import { createGranularPanel, type GranularPanel } from './ui/GranularPanel';
import { createBellPanel, type BellPanel } from './ui/BellPanel';
import { masterControlDefinitions, type MasterParameters, type MasterControlDefinition } from './parameters';
import { createMoodController, type MoodController } from './ai/MoodController';
import { fitSampleWindow, morphParameters } from './ai/PatchTransition';
import type { PatchPlan, PatchSnapshot } from './ai/PatchPlan';
import type { BellParameters, Parameters } from './parameters';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App container missing');

type PatchPanel = GranularPanel | BellPanel;

const rack = new AudioRack();
const panels = new Map<number, PatchPanel>();
let nextModuleId = 1;
const accents = ['#91c3cf', '#d3b182', '#b9a8d4', '#99c5a6'];

app.innerHTML = `
  <div class="application">
    <header class="app-bar">
      <div class="window-mark" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="app-name">GRANULARCUBE <span>/ PATCHER</span></div>
      <div class="app-version">WEB AUDIO ENGINE <b>●</b> LIVE</div>
    </header>
    <div class="app-layout">
      <nav class="tool-rail" aria-label="Workspace tools">
        <div class="rail-logo">G<span>~</span></div>
        <button class="rail-tool selected" type="button" title="Patch workspace" aria-label="Patch workspace">▦</button>
        <div class="rail-rule"></div>
        <button class="rail-tool rail-add" type="button" title="Add granular module" aria-label="Add granular module">+</button>
        <button class="rail-tool rail-bell" type="button" title="Add bell module" aria-label="Add bell module">◌</button>
        <div class="rail-spacer"></div>
        <div class="rail-label">GC / 01</div>
      </nav>
      <main class="work-area">
        <div class="work-toolbar">
          <div class="path-label"><span>PROJECT</span><b>/</b><span>GRANULARCUBE</span><b>/</b><strong>PATCH 01</strong></div>
          <div class="toolbar-right"><span id="module-count">01 MODULE</span><button id="stop-all" class="toolbar-button" type="button">■ STOP ALL</button><button id="add-module" class="toolbar-button primary" type="button">+ ADD GRANULAR~</button><button id="add-bell" class="toolbar-button primary" type="button">+ ADD BELL~</button><button id="show-mood" class="toolbar-button mood-link" type="button">◇ MOOD SETTINGS</button></div>
        </div>
        <section class="patch-stage" id="patch-stage" aria-label="Audio patch workspace">
          <div class="stage-caption"><span>PATCHING AREA</span><span>DRY / WET BUS · STEREO OUT</span></div>
          <svg class="patch-cables" id="patch-cables" aria-hidden="true"></svg>
          <div class="module-bank" id="module-bank"></div>
          <div class="side-stack"><aside class="master-node" id="master-node" aria-label="Master mixer and reverb">
            <div class="master-head"><span class="master-symbol">∑</span><div><span class="node-kicker">OUTPUT / BUS 01</span><h2>master~</h2></div></div>
            <div class="master-flow"><span class="master-input-port" id="master-input-port" title="Audio input"></span><span>SUM</span><span class="flow-arrow">→</span><span>REVERB</span><span class="flow-arrow">→</span><span>OUT</span></div>
            <div class="master-section"><div class="master-section-title">INPUT CHANNELS <span id="input-count">01</span></div><div class="channel-list" id="channel-list"></div></div>
            <div class="master-section"><div class="master-section-title">CHAMBER / REVERB</div><div id="reverb-controls" class="master-controls"></div><div class="master-hint">Shared effect after all synth modules</div></div>
            <div class="master-section master-output"><div class="master-section-title">OUTPUT</div><div id="output-controls" class="master-controls"></div><div class="output-readout"><span class="out-led"></span> AUDIO CONTEXT <span class="output-label">STEREO L / R</span></div></div>
          </aside><div id="mood-mount"></div></div>
          <div class="empty-state" id="empty-state" hidden><span>+</span><strong>EMPTY PATCH</strong><p>Add a synth module to route audio into the master bus.</p><button type="button">ADD GRANULAR~</button></div>
        </section>
        <footer class="status-bar"><span><i class="status-indicator"></i> PATCH READY</span><span id="active-count">0 ACTIVE</span><span>64 GRAINS / GRANULAR · 7 MODES / BELL</span><span class="status-right">AUDIO → MASTER BUS → STEREO OUT</span></footer>
      </main>
    </div>
  </div>
`;

const stage = document.querySelector<HTMLElement>('#patch-stage')!;
const moduleBank = document.querySelector<HTMLElement>('#module-bank')!;
const masterInput = document.querySelector<HTMLElement>('#master-input-port')!;
const cables = document.querySelector<SVGSVGElement>('#patch-cables')!;
const channelList = document.querySelector<HTMLElement>('#channel-list')!;
const emptyState = document.querySelector<HTMLElement>('#empty-state')!;
let cableFrame = 0;
let moodController: MoodController | null = null;
let cancelPatchTransition: (() => void) | null = null;

function format(value: number, unit = ''): string {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${unit}`;
}

function addMasterControl(
  target: HTMLElement,
  definition: MasterControlDefinition,
): void {
  const row = document.createElement('label');
  row.className = 'master-control';
  row.innerHTML = `<span class="master-control-head"><span>${definition.label}</span><output>${format(rack.currentParameters[definition.key], definition.unit)}</output></span><input data-master-param="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${rack.currentParameters[definition.key]}" aria-label="Master ${definition.label.toLowerCase()}" />`;
  const input = row.querySelector<HTMLInputElement>('input')!;
  const output = row.querySelector<HTMLOutputElement>('output')!;
  input.addEventListener('input', () => {
    const value = Number(input.value);
    rack.setParameter(definition.key, value);
    output.value = format(value, definition.unit);
  });
  target.append(row);
}

const reverbControls = document.querySelector<HTMLElement>('#reverb-controls')!;
for (const definition of masterControlDefinitions) {
  addMasterControl(definition.key === 'gain' ? document.querySelector<HTMLElement>('#output-controls')! : reverbControls, definition);
}

function getPatchSnapshot(): PatchSnapshot {
  return { master: rack.currentParameters, modules: [...panels.values()].map((panel) => panel.getSnapshot()) };
}

function applyMasterParameters(parameters: MasterParameters): void {
  for (const definition of masterControlDefinitions) {
    const input = document.querySelector<HTMLInputElement>(`[data-master-param="${definition.key}"]`)!;
    input.value = String(parameters[definition.key]);
    const value = Number(input.value);
    rack.setParameter(definition.key, value);
    input.closest('.master-control')!.querySelector<HTMLOutputElement>('output')!.value = format(value, definition.unit);
  }
}

async function applyPatchPlan(
  plan: PatchPlan,
  durationMs: number,
  onProgress: (progress: number) => void,
  generatedSamples: Map<number, { keyword: string; audioUrl: string }> = new Map(),
): Promise<void> {
  const granularMorphs: Array<{ panel: GranularPanel; from: Parameters; to: Parameters }> = [];
  const bellMorphs: Array<{ panel: BellPanel; from: BellParameters; to: BellParameters; sequence: number[]; changeSequence: boolean }> = [];
  for (const setting of plan.modules) {
    const panel = panels.get(setting.id);
    if (setting.type === 'granular') {
      if (panel?.kind !== 'granular') throw new Error(`GRAIN ${setting.id} is no longer available`);
      const generated = generatedSamples.get(setting.id);
      const sampleChanged = generated
        ? await panel.applyGeneratedSample(generated.keyword, generated.audioUrl, durationMs / 1000)
        : await panel.applySample(setting.sample, durationMs / 1000);
      if (panels.get(setting.id) !== panel) throw new Error(`GRAIN ${setting.id} was removed while loading its sample`);
      granularMorphs.push({
        panel,
        from: panel.engine.currentParameters,
        to: fitSampleWindow(setting.parameters, panel.engine.sampleDurationMs, sampleChanged),
      });
    } else {
      if (panel?.kind !== 'bell') throw new Error(`BELL ${setting.id} is no longer available`);
      bellMorphs.push({
        panel,
        from: panel.engine.currentParameters,
        to: setting.parameters,
        sequence: setting.sequence,
        changeSequence: setting.sequence.some((note, index) => note !== panel.engine.currentSequence[index]) ||
          setting.sequence.length !== panel.engine.currentSequence.length,
      });
    }
  }
  const masterFrom = rack.currentParameters;
  const start = performance.now();
  const masterNode = document.querySelector<HTMLElement>('#master-node')!;
  for (const { panel } of [...granularMorphs, ...bellMorphs]) panel.root.classList.add('morphing');
  masterNode.classList.add('morphing');
  try {
    await new Promise<void>((resolve, reject) => {
      let timer: number | null = null;
      let settled = false;
      let midpointApplied = false;
      const finish = (error?: Error): void => {
        if (settled) return;
        settled = true;
        if (timer !== null) window.clearTimeout(timer);
        cancelPatchTransition = null;
        if (error) reject(error); else resolve();
      };
      cancelPatchTransition = () => finish(new Error('Transition interrupted by a manual edit.'));
      const tick = (): void => {
        try {
          const progress = Math.min(1, (performance.now() - start) / durationMs);
          for (const { panel, from, to } of granularMorphs) {
            if (panels.get(Number(panel.root.dataset.moduleId)) !== panel) throw new Error(`${panel.label} was removed during the transition`);
            panel.applyParameters(morphParameters(from, to, progress, ['filterType']));
          }
          for (const { panel, from, to } of bellMorphs) {
            if (panels.get(Number(panel.root.dataset.moduleId)) !== panel) throw new Error(`${panel.label} was removed during the transition`);
            panel.applyParameters(morphParameters(from, to, progress, ['rootNote']));
          }
          if (progress >= 0.5 && !midpointApplied) {
            const remainingSeconds = durationMs / 2000;
            for (const { panel, to } of granularMorphs) panel.engine.transitionReverbDecay(to.reverbDecay, remainingSeconds);
            for (const { panel, to } of bellMorphs) panel.engine.transitionReverbDecay(to.reverbDecay, remainingSeconds);
            rack.transitionReverbDecay(plan.master.reverbDecay, remainingSeconds);
            for (const { panel, sequence, changeSequence } of bellMorphs) {
              if (changeSequence) panel.applySequence(sequence);
            }
            midpointApplied = true;
          }
          applyMasterParameters(morphParameters(masterFrom, plan.master, progress));
          onProgress(progress);
          moodController?.updateOverview();
          if (progress >= 1) finish(); else timer = window.setTimeout(tick, 33);
        } catch (error) {
          finish(error instanceof Error ? error : new Error('Transition failed'));
        }
      };
      tick();
    });
  } finally {
    for (const { panel } of [...granularMorphs, ...bellMorphs]) panel.root.classList.remove('morphing');
    masterNode.classList.remove('morphing');
    updatePatchState();
  }
}

function updatePatchState(): void {
  const count = panels.size;
  document.querySelector<HTMLElement>('#module-count')!.textContent = `${String(count).padStart(2, '0')} MODULE${count === 1 ? '' : 'S'}`;
  document.querySelector<HTMLElement>('#input-count')!.textContent = String(count).padStart(2, '0');
  const active = [...panels.values()].filter(({ engine }) => engine.isPlaying).length;
  document.querySelector<HTMLElement>('#active-count')!.textContent = `${active} ACTIVE`;
  emptyState.hidden = count !== 0;
  channelList.innerHTML = [...panels.entries()].map(([id, panel]) => {
    const color = accents[(id - 1) % accents.length];
    return `<div class="channel-row"><span class="channel-led ${panel.engine.isPlaying ? 'active' : ''}" style="--accent:${color}"></span><span>${panel.label}</span><small>${panel.engine.isPlaying ? 'RUN' : 'IDLE'}</small></div>`;
  }).join('');
  requestCableDraw();
  moodController?.updateOverview();
}

function drawCables(): void {
  cableFrame = 0;
  const stageRect = stage.getBoundingClientRect();
  const inputRect = masterInput.getBoundingClientRect();
  const endX = inputRect.left + inputRect.width / 2 - stageRect.left;
  const endY = inputRect.top + inputRect.height / 2 - stageRect.top;
  cables.setAttribute('viewBox', `0 0 ${stage.clientWidth} ${stage.offsetHeight}`);
  cables.innerHTML = [...panels.entries()].map(([id, panel]) => {
    const port = panel.outputPort.getBoundingClientRect();
    const startX = port.left + port.width / 2 - stageRect.left;
    const startY = port.top + port.height / 2 - stageRect.top;
    const bend = Math.max(45, Math.min(170, (endX - startX) * 0.42));
    const color = accents[(id - 1) % accents.length];
    return `<path d="M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}" stroke="${color}" />`;
  }).join('');
}

function requestCableDraw(): void {
  if (!cableFrame) cableFrame = requestAnimationFrame(drawCables);
}

const resizeObserver = new ResizeObserver(requestCableDraw);
resizeObserver.observe(stage);
resizeObserver.observe(moduleBank);
window.addEventListener('resize', requestCableDraw);
window.addEventListener('scroll', requestCableDraw, { passive: true });

function removeModule(id: number): void {
  const panel = panels.get(id);
  if (!panel) return;
  rack.removeModule(panel.engine);
  resizeObserver.unobserve(panel.root);
  panel.root.remove();
  panels.delete(id);
  updatePatchState();
}

function mountPanel(id: number, panel: PatchPanel): void {
  panel.root.style.setProperty('--accent', accents[(id - 1) % accents.length]);
  panels.set(id, panel);
  moduleBank.append(panel.root);
  resizeObserver.observe(panel.root);
  updatePatchState();
}

function addGranular(): number {
  const id = nextModuleId++;
  mountPanel(id, createGranularPanel(id, rack.createGranular(), removeModule, updatePatchState, () => cancelPatchTransition?.()));
  return id;
}

function addBell(): void {
  const id = nextModuleId++;
  mountPanel(id, createBellPanel(id, rack.createBell(), removeModule, updatePatchState));
}

document.querySelector<HTMLButtonElement>('#add-module')!.addEventListener('click', addGranular);
document.querySelector<HTMLButtonElement>('#add-bell')!.addEventListener('click', addBell);
document.querySelector<HTMLButtonElement>('.rail-add')!.addEventListener('click', addGranular);
document.querySelector<HTMLButtonElement>('.rail-bell')!.addEventListener('click', addBell);
emptyState.querySelector('button')!.addEventListener('click', addGranular);
document.querySelector<HTMLButtonElement>('#stop-all')!.addEventListener('click', () => {
  for (const panel of panels.values()) panel.stop();
  updatePatchState();
});

for (const eventName of ['input', 'change']) {
  app.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest('.module-card, .master-node')) {
      if (event.target.matches('.module-controls input, .module-controls select, .master-node input')) cancelPatchTransition?.();
      moodController?.updateOverview();
    }
  });
}

moodController = createMoodController(getPatchSnapshot, applyPatchPlan, {
  prepareImageLayers() {
    const existing = [...panels.values()].filter((panel) => panel.kind === 'granular').length;
    return Array.from({ length: Math.max(0, 3 - existing) }, () => addGranular());
  },
  discardImageLayers(ids) {
    for (const id of ids) removeModule(id);
  },
  async startImageComposition(ids) {
    for (const id of ids) {
      const panel = panels.get(id);
      if (panel && !panel.engine.isPlaying) await panel.start();
    }
  },
});
document.querySelector<HTMLElement>('#mood-mount')!.append(moodController.root);
document.querySelector<HTMLButtonElement>('#show-mood')!.addEventListener('click', () => {
  moodController?.root.scrollIntoView({ behavior: 'smooth', block: 'center' });
  moodController?.root.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
});

addGranular();
