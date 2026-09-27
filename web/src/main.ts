import './style.css';
import { AudioRack } from './audio/AudioRack';
import { createGranularPanel, type GranularPanel } from './ui/GranularPanel';
import { createPhysicalPanel, type PhysicalPanel } from './ui/PhysicalPanel';
import { masterControlDefinitions, type MasterParameters, type MasterControlDefinition } from './parameters';
import { createMoodController, type MoodController } from './ai/MoodController';
import { fitSampleWindow, morphParameters } from './ai/PatchTransition';
import type { PatchPlan, PatchSnapshot } from './ai/PatchPlan';
import type { PhysicalParameters, Parameters } from './parameters';
import type { ApplicationOptions, ApplicationReport } from './ai/Composition';
import { preparePatchSamples } from './ai/PatchPreparation';
import { PatchEditor } from './ui/PatchEditor';
import { createEffectPanel, type EffectPanel } from './ui/EffectPanel';
import type { EffectKind, EffectValues } from './audio/EffectNode';
import { ParameterLfoControl, updateParameterLfoDisplays } from './ui/ParameterLfoControl';
import { parameterLfoValue, type ParameterLfoMap } from './audio/ParameterLfo';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App container missing');

type PatchPanel = GranularPanel | PhysicalPanel;

const rack = new AudioRack();
const panels = new Map<number, PatchPanel>();
const effects = new Map<string, EffectPanel>();
let nextEffectId = 1;
const masterControls = masterControlDefinitions.filter((control) => control.key === 'gain');
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
        <button class="rail-tool rail-physical" type="button" title="Add physical module" aria-label="Add physical module">◌</button>
        <div class="rail-spacer"></div>
        <div class="rail-label">GC / 01</div>
      </nav>
      <main class="work-area">
        <div class="work-toolbar">
          <div class="path-label"><span>PROJECT</span><b>/</b><span>GRANULARCUBE</span><b>/</b><strong>PATCH 01</strong></div>
          <div class="toolbar-right"><span id="module-count">01 MODULE</span><button id="stop-all" class="toolbar-button" type="button">■ STOP ALL</button><button id="add-module" class="toolbar-button primary" type="button">+ ADD GRANULAR~</button><button id="add-physical" class="toolbar-button primary" type="button">+ ADD PHYSICAL~</button><button id="show-mood" class="toolbar-button mood-link" type="button">◇ MOOD SETTINGS</button></div>
        </div>
        <div class="patch-tools"><span>ADD EFFECT</span><button class="toolbar-button" data-add-effect="filter">+ FILTER~</button><button class="toolbar-button" data-add-effect="delay">+ DELAY~</button><button class="toolbar-button" data-add-effect="reverb">+ REVERB~</button><button class="toolbar-button" data-add-effect="spectral">+ SPECTRAL~</button><button class="toolbar-button" id="arrange">ARRANGE</button><button class="toolbar-button" id="disconnect" disabled>DISCONNECT CABLE</button></div>
        <div class="patch-help" id="patch-help" role="status">Drag headers to move nodes. Connect OUT → IN. Select a cable to disconnect it.</div>
        <div class="patch-viewport"><section class="patch-stage" id="patch-stage" aria-label="Audio patch workspace">
          <svg class="patch-cables" id="patch-cables" aria-label="Audio connections"></svg>
          <aside class="master-node" id="master-node" aria-label="Master output">
            <div class="master-head"><span class="master-symbol">∑</span><div><span class="node-kicker">OUTPUT / BUS 01</span><h2>master~</h2></div></div>
            <div class="master-flow"><button type="button" class="port input-port" id="master-input-port" aria-label="Connect to master input">IN</button><span>SUM</span><span class="flow-arrow">→</span><span>STEREO OUT</span></div>
            <div class="master-section"><div class="master-section-title">INPUT CHANNELS <span id="input-count">01</span></div><div class="channel-list" id="channel-list"></div></div>
            <div class="master-section master-output"><div class="master-section-title">OUTPUT</div><div id="output-controls" class="master-controls"></div><div class="output-readout"><span class="out-led"></span> AUDIO CONTEXT <span class="output-label">STEREO L / R</span></div></div>
          </aside>
        </section></div>
        <div id="mood-mount" class="mood-dock" hidden></div>
        <footer class="status-bar"><span><i class="status-indicator"></i> PATCH READY</span><span id="active-count">0 ACTIVE</span><span>SOURCES → EFFECTS → MASTER</span><span class="status-right">STEREO L / R</span></footer>
      </main>
    </div>
  </div>
`;

const stage = document.querySelector<HTMLElement>('#patch-stage')!;
const masterInput = document.querySelector<HTMLElement>('#master-input-port')!;
const cables = document.querySelector<SVGSVGElement>('#patch-cables')!;
const channelList = document.querySelector<HTMLElement>('#channel-list')!;
let moodController: MoodController | null = null;
let cancelPatchTransition: (() => void) | null = null;
let motionEnabled = true;
function manualEdit(): void { moodController?.cancelPending(); cancelPatchTransition?.(); }
const editor = new PatchEditor(stage, cables, rack.graph, document.querySelector('#patch-help')!, document.querySelector('#disconnect')!, () => { manualEdit(); updatePatchState(); });
editor.add('master', document.querySelector('#master-node')!, masterInput, undefined, 1450, 40);
document.querySelector('#arrange')!.addEventListener('click', () => editor.arrange());
let masterGainBase = rack.currentParameters.gain;
let masterGainLfo: ParameterLfoMap = {};
let masterGainLfoControl: ParameterLfoControl | null = null;
function refreshParameterLfos(): void {
  const time = rack.currentTime;
  for (const panel of effects.values()) panel.engine.applyParameterLfos(time);
  if (masterGainLfo.gain?.enabled) rack.setModulatedGain(parameterLfoValue(masterGainBase, 'master-gain', masterGainLfo.gain, time, 0, 1.5));
  updateParameterLfoDisplays(time);
}
window.setInterval(refreshParameterLfos, 100);

function format(value: number, unit = ''): string {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${unit}`;
}

function addMasterControl(
  target: HTMLElement,
  definition: MasterControlDefinition,
): void {
  const row = document.createElement('div');
  row.className = 'master-control';
  row.innerHTML = `<span class="master-control-head"><span>${definition.label}</span><output>${format(rack.currentParameters[definition.key], definition.unit)}</output></span><input data-master-param="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${rack.currentParameters[definition.key]}" aria-label="Master ${definition.label.toLowerCase()}" />`;
  const input = row.querySelector<HTMLInputElement>('input')!;
  const output = row.querySelector<HTMLOutputElement>('output')!;
  const lfo = new ParameterLfoControl(row.querySelector<HTMLElement>('.master-control-head')!, `master-${definition.key}`, input, (settings) => { masterGainLfo.gain = settings; }, (value) => format(value, definition.unit));
  masterGainLfoControl = lfo;
  masterGainLfo.gain = lfo.settings;
  input.addEventListener('input', () => {
    const value = Number(input.value);
    masterGainBase = value;
    masterGainLfoControl?.setBase(value);
    rack.setParameter(definition.key, value);
    output.value = format(value, definition.unit);
  });
  target.append(row);
}

for (const definition of masterControls) {
  addMasterControl(document.querySelector<HTMLElement>('#output-controls')!, definition);
}

function getPatchSnapshot(): PatchSnapshot {
  return { master: rack.currentParameters, modules: [...panels.values()].map((panel) => panel.getSnapshot()), effects: [...effects.values()].map((panel) => panel.getSnapshot()), connections: rack.graph.connections };
}

function applyMasterParameters(parameters: MasterParameters): void {
  for (const definition of masterControls) {
    const input = document.querySelector<HTMLInputElement>(`[data-master-param="${definition.key}"]`)!;
    input.value = String(parameters[definition.key]);
    const value = Number(input.value);
    masterGainBase = value;
    masterGainLfoControl?.setBase(value);
    rack.setParameter(definition.key, value);
    input.closest('.master-control')!.querySelector<HTMLOutputElement>('output')!.value = format(value, definition.unit);
  }
}

async function applyPatchPlan(
  plan: PatchPlan,
  durationMs: number,
  onProgress: (progress: number) => void,
  generatedSamples: Map<number, { keyword: string; audioUrl: string }> = new Map(),
  startImageModules = false,
  options: ApplicationOptions = {},
): Promise<ApplicationReport> {
  options.signal?.throwIfAborted();
  options.onPhase?.('decode');
  const preparationStart = performance.now();
  const transaction = await preparePatchSamples(plan, panels, getPatchSnapshot, generatedSamples, options.signal);
  const prepared = transaction.entries;
  await rack.resume();
  options.signal?.throwIfAborted();
  transaction.validate();
  const decodeMs = performance.now() - preparationStart;
  const granularMorphs: Array<{ panel: GranularPanel; from: Parameters; to: Parameters }> = [];
  const physicalMorphs: Array<{ panel: PhysicalPanel; from: PhysicalParameters; to: PhysicalParameters; sequence: number[]; changeSequence: boolean }> = [];
  const startedForImage: PatchPanel[] = [];
  const effectMorphs = (plan.effects ?? []).map((setting) => {
    const panel = effects.get(setting.id);
    if (!panel || panel.engine.type !== setting.type) throw new Error(`Effect ${setting.id} is no longer available`);
    return { panel, from: panel.engine.parameters, to: setting.parameters };
  });
  for (const setting of plan.modules) {
    const panel = panels.get(setting.id);
    if (setting.type === 'granular') {
      if (panel?.kind !== 'granular') throw new Error(`GRAIN ${setting.id} is no longer available`);
      const sample = prepared.find((item) => item.id === setting.id)!.sample!;
      const from = panel.engine.currentParameters;
      // New sample windows use the new duration throughout the morph.
      if (sample.changed) { from.selectionStart = 0; from.selectionEnd = sample.durationMs; }
      granularMorphs.push({
        panel,
        from,
        to: fitSampleWindow(setting.parameters, sample.durationMs, sample.changed),
      });
    } else {
      if (panel?.kind !== 'physical') throw new Error(`PHYSICAL ${setting.id} is no longer available`);
      physicalMorphs.push({
        panel,
        from: panel.engine.currentParameters,
        to: setting.parameters,
        sequence: setting.sequence,
        changeSequence: setting.sequence.some((note, index) => note !== panel.engine.currentSequence[index]) ||
          setting.sequence.length !== panel.engine.currentSequence.length,
      });
    }
  }
  // Every fetch/decode and revision check has succeeded. Commit all buffers in one JS turn.
  cancelPatchTransition?.();
  for (const item of prepared) item.panel.engine.setMovement(null);
  transaction.commit(durationMs / 1000);
  options.onPhase?.('transition');
  if (startImageModules) {
    try {
      for (const morph of granularMorphs) {
        if (morph.panel.engine.isPlaying) continue;
        morph.from.gain = 0;
        morph.panel.applyParameters(morph.from);
        await morph.panel.start();
        startedForImage.push(morph.panel);
      }
      for (const morph of physicalMorphs) {
        if (morph.panel.engine.isPlaying) continue;
        morph.from.gain = 0;
        morph.panel.applyParameters(morph.from);
        await morph.panel.start();
        startedForImage.push(morph.panel);
      }
    } catch (error) {
      for (const panel of startedForImage) panel.stop();
      throw error;
    }
  }
  const masterFrom = rack.currentParameters;
  const start = performance.now();
  const masterNode = document.querySelector<HTMLElement>('#master-node')!;
  for (const { panel } of [...granularMorphs, ...physicalMorphs, ...effectMorphs]) panel.root.classList.add('morphing');
  masterNode.classList.add('morphing');
  let completed = false;
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
        options.signal?.removeEventListener('abort', onAbort);
        if (error) reject(error); else resolve();
      };
      const onAbort = () => finish(new Error('Transition canceled'));
      options.signal?.addEventListener('abort', onAbort, { once: true });
      cancelPatchTransition = () => finish(new Error('Transition interrupted by a manual edit.'));
      const tick = (): void => {
        try {
          const progress = Math.min(1, (performance.now() - start) / durationMs);
          for (const { panel, from, to } of granularMorphs) {
            if (panels.get(Number(panel.root.dataset.moduleId)) !== panel) throw new Error(`${panel.label} was removed during the transition`);
            panel.applyParameters(morphParameters(from, to, progress, ['filterType']));
          }
          for (const { panel, from, to } of physicalMorphs) {
            if (panels.get(Number(panel.root.dataset.moduleId)) !== panel) throw new Error(`${panel.label} was removed during the transition`);
            panel.applyParameters(morphParameters(from, to, progress, ['rootNote', 'filterType']));
          }
          if (progress >= 0.5 && !midpointApplied) {
            const remainingSeconds = durationMs / 2000;
            for (const { panel, to } of effectMorphs) if (panel.engine.type === 'reverb') panel.engine.transitionDecay(Number(to.decay), remainingSeconds);
            for (const { panel, sequence, changeSequence } of physicalMorphs) {
              if (changeSequence) panel.applySequence(sequence);
            }
            midpointApplied = true;
          }
          for (const { panel, from, to } of effectMorphs) {
            const values: EffectValues = morphParameters(from, to, progress, ['filterType']);
            if (panel.engine.type === 'reverb') delete values.decay;
            panel.applyParameters(values);
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
    completed = true;
    for (const item of prepared) item.panel.engine.setMovement(options.movement ?? null);
  } finally {
    if (!completed) for (const panel of startedForImage) panel.stop();
    for (const { panel } of [...granularMorphs, ...physicalMorphs, ...effectMorphs]) panel.root.classList.remove('morphing');
    masterNode.classList.remove('morphing');
    updatePatchState();
  }
  return { decodeMs, transitionMs: performance.now() - start, samples: prepared.flatMap((item) => item.sample ? [{ id: item.id, durationMs: item.sample.durationMs, changed: item.sample.changed }] : []) };
}

function updatePatchState(): void {
  const count = panels.size + effects.size;
  document.querySelector<HTMLElement>('#module-count')!.textContent = `${String(count).padStart(2, '0')} MODULE${count === 1 ? '' : 'S'}`;
  const incoming = rack.graph.connections.filter((edge) => edge.to === 'master');
  document.querySelector<HTMLElement>('#input-count')!.textContent = String(incoming.length).padStart(2, '0');
  const active = [...panels.values()].filter(({ engine }) => engine.isPlaying).length;
  document.querySelector<HTMLElement>('#active-count')!.textContent = `${active} ACTIVE`;
  channelList.textContent = incoming.length ? incoming.map((edge) => effects.has(edge.from) ? `${effects.get(edge.from)!.engine.type}~ / ${edge.from}` : panels.get(Number(edge.from.split(':')[1]))?.label ?? edge.from).join(' · ') : 'No input cables';
  requestCableDraw();
  moodController?.updateOverview();
}

function requestCableDraw(): void { editor.redraw(); }

function addEffect(kind: EffectKind, x = 420, y = 360): string {
  manualEdit();
  const id = `fx${nextEffectId++}`;
  const engine = rack.createEffect(id, kind);
  const panel = createEffectPanel(id, engine, () => {
    manualEdit(); rack.graph.remove(id); engine.dispose(); editor.remove(id); effects.delete(id); updatePatchState();
  }, manualEdit);
  effects.set(id, panel);
  editor.add(id, panel.root, panel.inputPort, panel.outputPort, x, y);
  updatePatchState();
  return id;
}

for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-add-effect]'))) {
  button.addEventListener('click', () => {
    const viewport = document.querySelector<HTMLElement>('.patch-viewport')!;
    addEffect(button.dataset.addEffect as EffectKind, viewport.scrollLeft + 60 + effects.size % 5 * 24, viewport.scrollTop + 220 + effects.size % 5 * 24);
    editor.message('Effect added. Connect its IN and OUT ports to include it in the audio route.');
  });
}

function removeModule(id: number): void {
  const panel = panels.get(id);
  if (!panel) return;
  manualEdit();
  rack.removeModule(panel.engine);
  editor.remove(`source:${id}`);
  panels.delete(id);
  updatePatchState();
}

function mountPanel(id: number, panel: PatchPanel): void {
  panel.engine.setMotionEnabled(motionEnabled);
  panel.root.style.setProperty('--accent', accents[(id - 1) % accents.length]);
  const y = Math.max(40, ...[...panels.values()].map((existing) => existing.root.offsetTop + Math.max(220, existing.root.offsetHeight) + 70));
  panels.set(id, panel);
  editor.add(`source:${id}`, panel.root, undefined, panel.outputPort, 40, y);
  const filter = addEffect('filter', 410, y);
  const reverb = addEffect('reverb', panel.kind === 'physical' ? 1070 : 740, y);
  editor.connect(`source:${id}`, filter);
  if (panel.kind === 'physical') {
    const delay = addEffect('delay', 740, y);
    editor.connect(filter, delay); editor.connect(delay, reverb);
  } else editor.connect(filter, reverb);
  editor.connect(reverb, 'master');
  updatePatchState();
}

function addGranular(): number {
  manualEdit();
  const id = nextModuleId++;
  mountPanel(id, createGranularPanel(id, rack.createGranular(`source:${id}`), removeModule, updatePatchState, manualEdit));
  return id;
}

function addPhysical(): number {
  manualEdit();
  const id = nextModuleId++;
  mountPanel(id, createPhysicalPanel(id, rack.createPhysical(`source:${id}`), removeModule, updatePatchState));
  return id;
}

document.querySelector<HTMLButtonElement>('#add-module')!.addEventListener('click', addGranular);
document.querySelector<HTMLButtonElement>('#add-physical')!.addEventListener('click', addPhysical);
document.querySelector<HTMLButtonElement>('.rail-add')!.addEventListener('click', addGranular);
document.querySelector<HTMLButtonElement>('.rail-physical')!.addEventListener('click', addPhysical);
document.querySelector<HTMLButtonElement>('#stop-all')!.addEventListener('click', () => {
  moodController?.cancelPending();
  cancelPatchTransition?.();
  for (const panel of panels.values()) panel.stop();
  updatePatchState();
});

for (const eventName of ['input', 'change']) {
  app.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest('.module-card, .master-node')) {
      if (!event.target.closest('.parameter-lfo') && event.target.matches('.module-controls input, .module-controls select, .physical-model select, .master-node input, .effect-controls input, .effect-controls select, .effect-bypass input')) {
        moodController?.cancelPending();
        cancelPatchTransition?.();
        const card = event.target.closest<HTMLElement>('.module-card');
        if (card) panels.get(Number(card.dataset.moduleId))?.engine.setMovement(null);
      }
      moodController?.updateOverview();
    }
  });
}

moodController = createMoodController(getPatchSnapshot, applyPatchPlan, (enabled) => {
  motionEnabled = enabled;
  for (const panel of panels.values()) panel.engine.setMotionEnabled(enabled);
});
document.querySelector<HTMLElement>('#mood-mount')!.append(moodController.root);
document.querySelector<HTMLButtonElement>('#show-mood')!.addEventListener('click', () => {
  const dock = document.querySelector<HTMLElement>('#mood-mount')!;
  dock.hidden = !dock.hidden;
  document.querySelector('#show-mood')!.setAttribute('aria-expanded', String(!dock.hidden));
  if (!dock.hidden) moodController?.root.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
});

addGranular();
