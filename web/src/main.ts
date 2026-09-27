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
import { createConfigController, type ConfigController } from './ui/ConfigController';
import { encodeSample, migratePianoPauses, validateSetup, type PatchSetup, type SetupModule } from './config/Setup';
import { sampleUrl } from './config/SetupClient';
import { validateSfxTemplate } from './ai/Composition';
import { createPianoSamplerPanel, type PianoSamplerPanel } from './ui/PianoSamplerPanel';
import type { PianoParameters } from './audio/PianoProgram';
import { loadPianoBuffers, type LoadedPianoProgram } from './audio/PianoSamplerEngine';
import { pianoSampleUrl } from './ai/PianoBankClient';
import { parameterIsIgnored, preservePlanParameters, sampleIsFixed } from './ai/ParameterPolicy';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App container missing');

type PatchPanel = GranularPanel | PhysicalPanel | PianoSamplerPanel;

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
      <nav class="tool-rail" aria-label="Module library">
        <div class="rail-heading"><div class="rail-logo" aria-hidden="true">G<span>~</span></div><span>ADD MODULE</span></div>
        <div class="rail-library">
          <section class="rail-group rail-instruments" aria-labelledby="instrument-menu-title">
            <h2 id="instrument-menu-title">INSTRUMENTS</h2>
            <button id="add-module" class="rail-module" type="button" title="Add granular instrument" aria-label="Add granular instrument"><span class="rail-module-icon" aria-hidden="true">⋮</span><span class="rail-module-name">granular~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
            <button id="add-physical" class="rail-module" type="button" title="Add physical instrument" aria-label="Add physical instrument"><span class="rail-module-icon" aria-hidden="true">◌</span><span class="rail-module-name">physical~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
            <button id="add-piano" class="rail-module" type="button" title="Add piano sampler instrument" aria-label="Add piano sampler instrument"><span class="rail-module-icon" aria-hidden="true">♬</span><span class="rail-module-name">piano_sampler~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
          </section>
          <div class="rail-divider" aria-hidden="true"></div>
          <section class="rail-group rail-effects" aria-labelledby="effect-menu-title">
            <h2 id="effect-menu-title">EFFECTS</h2>
            <button class="rail-module" data-add-effect="filter" type="button" title="Add filter effect" aria-label="Add filter effect"><span class="rail-module-icon" aria-hidden="true">⌁</span><span class="rail-module-name">filter~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
            <button class="rail-module" data-add-effect="delay" type="button" title="Add delay effect" aria-label="Add delay effect"><span class="rail-module-icon" aria-hidden="true">↔</span><span class="rail-module-name">delay~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
            <button class="rail-module" data-add-effect="reverb" type="button" title="Add reverb effect" aria-label="Add reverb effect"><span class="rail-module-icon" aria-hidden="true">≋</span><span class="rail-module-name">reverb~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
            <button class="rail-module" data-add-effect="spectral" type="button" title="Add spectral effect" aria-label="Add spectral effect"><span class="rail-module-icon" aria-hidden="true">▥</span><span class="rail-module-name">spectral~</span><span class="rail-module-add" aria-hidden="true">+</span></button>
          </section>
        </div>
        <div class="rail-footer">CLICK A MODULE TO ADD</div>
      </nav>
      <main class="work-area">
        <div class="work-toolbar">
          <div class="path-label"><span>PROJECT</span><b>/</b><span>GRANULARCUBE</span><b>/</b><strong>PATCH 01</strong></div>
          <div class="toolbar-right"><span id="module-count">01 MODULE</span><button id="stop-all" class="toolbar-button" type="button">■ STOP ALL</button><button id="show-config" class="toolbar-button" type="button" aria-expanded="false" aria-controls="config-mount">⚙ CONFIG</button><button id="show-mood" class="toolbar-button mood-link" type="button">◇ MOOD SETTINGS</button></div>
        </div>
        <div class="patch-tools"><span>PATCH</span><button class="toolbar-button" id="arrange" type="button">ARRANGE</button><button class="toolbar-button" id="disconnect" type="button" disabled>DISCONNECT CABLE</button></div>
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
        <div id="config-mount" class="config-dock" hidden></div>
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
let configController: ConfigController | null = null;
let cancelPatchTransition: (() => void) | null = null;
let motionEnabled = true;
let patchRevision = 0;
let startupRevision = 0;
function manualEdit(): void { patchRevision++; moodController?.cancelPending(); cancelPatchTransition?.(); }
const editor = new PatchEditor(stage, cables, rack.graph, document.querySelector('#patch-help')!, document.querySelector('#disconnect')!, () => { manualEdit(); updatePatchState(); });
editor.add('master', document.querySelector('#master-node')!, masterInput, undefined, 1450, 40);
document.querySelector('#arrange')!.addEventListener('click', () => { patchRevision++; editor.arrange(); });
let masterGainBase = rack.currentParameters.gain;
let masterGainLfo: ParameterLfoMap = {};
let masterGainLfoControl: ParameterLfoControl | null = null;
function refreshParameterLfos(): void {
  const time = rack.currentTime;
  for (const panel of effects.values()) panel.engine.applyParameterLfos(time);
  for (const panel of panels.values()) if (panel.kind === 'piano_sampler') panel.engine.applyParameterLfos(time);
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
  return { master: rack.currentParameters, modules: [...panels.values()].map((panel) => panel.getSnapshot()), effects: [...effects.values()].map((panel) => panel.getSnapshot()), connections: rack.graph.connections, ignoredNodes: editor.ignoredNodes, ignoredParameters: editor.ignoredParameters };
}

function applyMasterParameters(parameters: MasterParameters): void {
  for (const definition of masterControls) {
    const input = document.querySelector<HTMLInputElement>(`[data-master-param="${definition.key}"]`)!;
    input.value = String(parameters[definition.key]);
    const value = parameters[definition.key];
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
  // Enforce the checkboxes locally as well as in the model request.
  plan = { ...plan, modules: plan.modules.filter((module) => !editor.isIgnored(`source:${module.id}`)),
    effects: plan.effects?.filter((effect) => !editor.isIgnored(effect.id)) };
  const protectionSnapshot = getPatchSnapshot();
  plan = preservePlanParameters(plan, protectionSnapshot);
  generatedSamples = new Map([...generatedSamples].filter(([id]) => !sampleIsFixed(protectionSnapshot, id)));
  const updateMaster = !editor.isIgnored('master');
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
  const pianoMorphs: Array<{ panel: PianoSamplerPanel; from: PianoParameters; to: PianoParameters }> = [];
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
    } else if (setting.type === 'physical') {
      if (panel?.kind !== 'physical') throw new Error(`PHYSICAL ${setting.id} is no longer available`);
      physicalMorphs.push({
        panel,
        from: panel.engine.currentParameters,
        to: setting.parameters,
        sequence: setting.sequence,
        changeSequence: setting.sequence.some((note, index) => note !== panel.engine.currentSequence[index]) ||
          setting.sequence.length !== panel.engine.currentSequence.length,
      });
    } else {
      if (panel?.kind !== 'piano_sampler') throw new Error(`PIANO ${setting.id} is no longer available`);
      pianoMorphs.push({ panel, from: panel.engine.currentParameters, to: setting.parameters });
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
        if (!parameterIsIgnored(protectionSnapshot, `source:${morph.panel.root.dataset.moduleId}`, 'gain')) morph.from.gain = 0;
        morph.panel.applyParameters(morph.from);
        await morph.panel.start();
        startedForImage.push(morph.panel);
      }
      for (const morph of physicalMorphs) {
        if (morph.panel.engine.isPlaying) continue;
        if (!parameterIsIgnored(protectionSnapshot, `source:${morph.panel.root.dataset.moduleId}`, 'gain')) morph.from.gain = 0;
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
  for (const { panel } of [...granularMorphs, ...physicalMorphs, ...pianoMorphs, ...effectMorphs]) panel.root.classList.add('morphing');
  if (updateMaster) masterNode.classList.add('morphing');
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
          for (const { panel, from, to } of pianoMorphs) {
            if (panels.get(Number(panel.root.dataset.moduleId)) !== panel) throw new Error(`${panel.label} was removed during the transition`);
            panel.applyParameters(morphParameters(from, to, progress));
          }
          if (progress >= 0.5 && !midpointApplied) {
            const remainingSeconds = durationMs / 2000;
            for (const { panel, to } of effectMorphs) if (panel.engine.type === 'reverb' && !parameterIsIgnored(protectionSnapshot, panel.getSnapshot().id, 'decay')) panel.engine.transitionDecay(Number(to.decay), remainingSeconds);
            for (const { panel, sequence, changeSequence } of physicalMorphs) {
              if (changeSequence) panel.applySequence(sequence);
            }
            for (const item of prepared) item.piano?.commit();
            midpointApplied = true;
          }
          for (const { panel, from, to } of effectMorphs) {
            const values: EffectValues = morphParameters(from, to, progress, ['filterType']);
            if (panel.engine.type === 'reverb') delete values.decay;
            panel.applyParameters(values);
          }
          if (updateMaster) applyMasterParameters(morphParameters(masterFrom, plan.master, progress));
          onProgress(progress);
          moodController?.updateOverview();
          if (progress >= 1) finish(); else timer = window.setTimeout(tick, 33);
        } catch (error) {
          finish(error instanceof Error ? error : new Error('Transition failed'));
        }
      };
      tick();
    });
    if (startImageModules) for (const { panel } of pianoMorphs) {
      if (panel.engine.isPlaying || !panel.engine.currentGestures.length) continue;
      await panel.start(); startedForImage.push(panel);
    }
    completed = true;
    for (const item of prepared) item.panel.engine.setMovement(options.movement ?? null);
  } finally {
    if (!completed) for (const panel of startedForImage) panel.stop();
    for (const { panel } of [...granularMorphs, ...physicalMorphs, ...pianoMorphs, ...effectMorphs]) panel.root.classList.remove('morphing');
    masterNode.classList.remove('morphing');
    updatePatchState();
  }
  return { decodeMs, transitionMs: performance.now() - start, samples: prepared.flatMap((item) => item.sample ? [{ id: item.id, durationMs: item.sample.durationMs, changed: item.sample.changed }] : []),
    piano: pianoMorphs.map(({ panel }) => ({ id: Number(panel.root.dataset.moduleId), gestureCount: panel.engine.currentGestures.length,
      keys: [...new Set(panel.engine.currentGestures.flatMap((gesture) => gesture.notes.map((note) => note.midi)))] })) };
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

function removeEffect(id: string): void {
  const panel = effects.get(id); if (!panel) return;
  manualEdit(); rack.graph.remove(id); panel.engine.dispose(); editor.remove(id); effects.delete(id); updatePatchState();
}

function addEffect(kind: EffectKind, x = 420, y = 360, savedId?: string): string {
  manualEdit();
  const id = savedId ?? `fx${nextEffectId++}`;
  const engine = rack.createEffect(id, kind);
  const panel = createEffectPanel(id, engine, () => removeEffect(id), manualEdit);
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

function mountPanel(id: number, panel: PatchPanel, route = true): void {
  panel.engine.setMotionEnabled(motionEnabled);
  panel.root.style.setProperty('--accent', accents[(id - 1) % accents.length]);
  const y = Math.max(40, ...[...panels.values()].map((existing) => existing.root.offsetTop + Math.max(220, existing.root.offsetHeight) + 70));
  panels.set(id, panel);
  editor.add(`source:${id}`, panel.root, undefined, panel.outputPort, 40, y);
  if (!route) { updatePatchState(); return; }
  const filter = addEffect('filter', 410, y);
  const reverb = addEffect('reverb', panel.kind !== 'granular' ? 1070 : 740, y);
  editor.connect(`source:${id}`, filter);
  if (panel.kind !== 'granular') {
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

function addPiano(): number {
  manualEdit(); const id = nextModuleId++;
  mountPanel(id, createPianoSamplerPanel(id, rack.createPiano(`source:${id}`), removeModule, updatePatchState, manualEdit));
  return id;
}

function captureSetup(): PatchSetup {
  if (!moodController || !configController) throw new Error('Configuration is still initializing.');
  // Read the authored parameters, not the sliders' momentary LFO positions.
  const modules: SetupModule[] = [...panels].map(([id, panel]) => {
    if (panel.kind === 'physical') return { id, type: 'physical', playing: panel.engine.isPlaying,
      parameters: panel.engine.currentParameters, sequence: panel.engine.currentSequence, movement: panel.engine.currentMovement };
    if (panel.kind === 'piano_sampler') return { id, type: 'piano_sampler', playing: panel.engine.isPlaying,
      parameters: panel.engine.currentParameters, bank: panel.engine.currentBank, gestures: panel.engine.currentGestures, movement: panel.engine.currentMovement };
    const buffer = panel.engine.sampleBuffer;
    const sample = panel.getSampleReference();
    if (!buffer || !sample.name) throw new Error(`${panel.label}: wait for its sample to finish loading before saving.`);
    return { id, type: 'granular', playing: panel.engine.isPlaying, parameters: panel.engine.currentParameters, movement: panel.engine.currentMovement,
      sample: sample.builtin ? { kind: 'builtin', name: sample.name, filename: sample.name }
        : { kind: 'asset', name: sample.name, audioBase64: encodeSample(buffer) } };
  });
  return { version: 1, models: configController.getModels(), mood: moodController.getSettings(),
    master: rack.currentParameters, modules, effects: [...effects.values()].map((panel) => panel.getSnapshot()),
    connections: rack.graph.connections.map(({ from, to }) => ({ from, to })), layout: editor.getLayout(),
    lfos: structuredClone(Object.fromEntries([
      ['master', masterGainLfo], ...[...panels].map(([id, panel]) => [`source:${id}`, panel.lfos]),
      ...[...effects].map(([id, panel]) => [id, panel.lfos]),
    ])) };
}

async function applySetup(setup: PatchSetup, autoplay: boolean): Promise<void> {
  setup = migratePianoPauses(setup);
  validateSetup(setup); validateSfxTemplate(setup.mood.prompts.sfxTemplate);
  if (!autoplay && patchRevision !== startupRevision) throw new Error('Startup setup was skipped because you already edited the patch. You can load it from Config.');
  manualEdit();
  const revision = patchRevision;
  const audio = new Map<number, AudioBuffer>();
  const pianoPrograms = new Map<number, LoadedPianoProgram>();
  // Stage every sample first. Missing files or invalid audio leave the current patch intact.
  await Promise.all(setup.modules.map(async (source) => {
    if (source.type === 'piano_sampler') {
      const buffers = await loadPianoBuffers(source.bank, source.gestures,
        (sample) => rack.prepareSample(pianoSampleUrl(sample.filename, source.bank.revision)));
      pianoPrograms.set(source.id, { bank: source.bank, gestures: source.gestures, buffers }); return;
    }
    if (source.type !== 'granular') return;
    const buffer = await rack.prepareSample(sampleUrl(source.sample));
    const durationMs = buffer.duration * 1000;
    if (source.parameters.selectionStart > durationMs + 1 || source.parameters.selectionEnd > durationMs + 1) {
      throw new Error(`Saved sample for GRAIN ${source.id} is shorter than its source window.`);
    }
    audio.set(source.id, buffer);
  }));
  if (autoplay && setup.modules.some((source) => source.playing)) await rack.resume();
  if (patchRevision !== revision) throw new Error('Patch changed while preparing the setup. Load again to preserve your edits.');
  for (const id of [...panels.keys()]) removeModule(id);
  for (const id of [...effects.keys()]) removeEffect(id);
  nextModuleId = Math.max(0, ...setup.modules.map((source) => source.id)) + 1;
  nextEffectId = Math.max(0, ...setup.effects.map((effect) => Number(effect.id.slice(2)))) + 1;
  for (const source of setup.modules) {
    let panel: PatchPanel;
    if (source.type === 'granular') {
      panel = createGranularPanel(source.id, rack.createGranular(`source:${source.id}`), removeModule, updatePatchState, manualEdit,
        { name: source.sample.name, buffer: audio.get(source.id)!, builtin: source.sample.kind === 'builtin' });
      for (const key of Object.keys(source.parameters) as (keyof Parameters)[]) panel.engine.setParameter(key, source.parameters[key]);
      mountPanel(source.id, panel, false);
      panel.applyParameters(source.parameters);
    } else if (source.type === 'physical') {
      panel = createPhysicalPanel(source.id, rack.createPhysical(`source:${source.id}`), removeModule, updatePatchState);
      for (const key of Object.keys(source.parameters) as (keyof PhysicalParameters)[]) panel.engine.setParameter(key, source.parameters[key]);
      mountPanel(source.id, panel, false);
      panel.applyParameters(source.parameters); panel.applySequence(source.sequence);
    } else {
      panel = createPianoSamplerPanel(source.id, rack.createPiano(`source:${source.id}`), removeModule, updatePatchState, manualEdit, pianoPrograms.get(source.id)!);
      mountPanel(source.id, panel, false); panel.applyParameters(source.parameters);
    }
    panel.applyLfos(setup.lfos[`source:${source.id}`]);
    panel.engine.setMovement(source.movement ?? null);
  }
  for (const effect of setup.effects) {
    addEffect(effect.type, 40, 40, effect.id);
    const panel = effects.get(effect.id)!;
    panel.applyParameters(effect.parameters); panel.applyBypass(effect.bypass); panel.applyLfos(setup.lfos[effect.id]);
  }
  for (const edge of setup.connections) editor.connect(edge.from, edge.to);
  for (const key of Object.keys(setup.master) as (keyof MasterParameters)[]) rack.setParameter(key, setup.master[key]);
  applyMasterParameters(setup.master);
  if (setup.lfos.master.gain) masterGainLfoControl?.applySettings(setup.lfos.master.gain);
  moodController!.applySettings(setup.mood);
  configController!.applyModels(setup.models);
  editor.applyLayout(setup.layout);
  const viewport = document.querySelector<HTMLElement>('.patch-viewport')!;
  viewport.scrollTo(0, 0);
  if (autoplay) {
    for (const source of setup.modules) if (source.playing) await panels.get(source.id)!.start();
  }
  refreshParameterLfos(); updatePatchState();
  editor.message(autoplay ? 'Setup loaded.' : 'Startup setup loaded. Press PLAY to hear it.');
}

document.querySelector<HTMLButtonElement>('#add-module')!.addEventListener('click', addGranular);
document.querySelector<HTMLButtonElement>('#add-physical')!.addEventListener('click', addPhysical);
document.querySelector<HTMLButtonElement>('#add-piano')!.addEventListener('click', addPiano);
document.querySelector<HTMLButtonElement>('#stop-all')!.addEventListener('click', () => {
  manualEdit();
  for (const panel of panels.values()) panel.stop();
  updatePatchState();
});

for (const eventName of ['input', 'change']) {
  app.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest('.patch-stage, .mood-dock')) patchRevision++;
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
}, () => configController?.getModels() ?? { text: 'gpt-6-sol', image: 'gpt-6-sol' });
document.querySelector<HTMLElement>('#mood-mount')!.append(moodController.root);
document.querySelector<HTMLButtonElement>('#show-mood')!.addEventListener('click', () => {
  const dock = document.querySelector<HTMLElement>('#mood-mount')!;
  dock.hidden = !dock.hidden;
  if (!dock.hidden) {
    document.querySelector<HTMLElement>('#config-mount')!.hidden = true;
    document.querySelector('#show-config')!.setAttribute('aria-expanded', 'false');
  }
  document.querySelector('#show-mood')!.setAttribute('aria-expanded', String(!dock.hidden));
  if (!dock.hidden) moodController?.root.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
});

configController = createConfigController(captureSetup, applySetup);
document.querySelector<HTMLElement>('#config-mount')!.append(configController.root);
document.querySelector<HTMLButtonElement>('#show-config')!.addEventListener('click', () => {
  const dock = document.querySelector<HTMLElement>('#config-mount')!;
  dock.hidden = !dock.hidden;
  if (!dock.hidden) {
    document.querySelector<HTMLElement>('#mood-mount')!.hidden = true;
    document.querySelector('#show-mood')!.setAttribute('aria-expanded', 'false');
  }
  document.querySelector('#show-config')!.setAttribute('aria-expanded', String(!dock.hidden));
  if (!dock.hidden) configController?.root.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true });
});
app.addEventListener('pointerdown', (event) => {
  if (event.target instanceof Element && event.target.closest('.patch-stage, .mood-dock')) patchRevision++;
});
app.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('.patch-stage, .mood-dock')) patchRevision++;
});
app.addEventListener('keydown', (event) => {
  if (event.key.startsWith('Arrow') && event.target instanceof Element && event.target.matches('.module-head, .master-head')) patchRevision++;
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const id of ['mood', 'config']) {
    const dock = document.querySelector<HTMLElement>(`#${id}-mount`)!;
    if (!dock.hidden) { dock.hidden = true; document.querySelector(`#show-${id}`)!.setAttribute('aria-expanded', 'false'); break; }
  }
});

addGranular();
startupRevision = patchRevision;
void configController.initialize();
