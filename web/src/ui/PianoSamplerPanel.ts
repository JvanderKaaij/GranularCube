import { PianoSamplerEngine, type LoadedPianoProgram, type PreparedPianoProgram } from '../audio/PianoSamplerEngine';
import { pianoControls, pianoNoteName, initialPianoGestures, parsePianoGestures, type PianoParameters, type PianoGesture } from '../audio/PianoProgram';
import { requestPianoBank } from '../ai/PianoBankClient';
import type { PianoSnapshot } from '../ai/PatchPlan';
import { ParameterLfoControl } from './ParameterLfoControl';
import { createParameterLock } from './ParameterLock';
import type { ParameterLfoMap } from '../audio/ParameterLfo';

export interface PianoSamplerPanel {
  kind: 'piano_sampler'; root: HTMLElement; outputPort: HTMLElement; label: string; engine: PianoSamplerEngine;
  lfos: ParameterLfoMap; applyLfos(settings: ParameterLfoMap): void;
  getSnapshot(): PianoSnapshot; applyParameters(parameters: PianoParameters): void;
  prepareGestures(gestures: PianoGesture[], signal?: AbortSignal): Promise<PreparedPianoProgram>;
  start(): Promise<void>; stop(): void;
}
export function createPianoSamplerPanel(id: number, engine: PianoSamplerEngine, onRemove: (id: number) => void,
  onStateChange: () => void, onManualEdit: () => void, initial?: LoadedPianoProgram): PianoSamplerPanel {
  const label = `PIANO ${String(id).padStart(2, '0')}`;
  const root = document.createElement('article'); root.className = 'module-card piano-card'; root.dataset.moduleId = String(id);
  root.innerHTML = `<div class="module-head"><div class="module-identity"><span class="module-icon">♬</span><div><span class="module-kicker">INSTRUMENT / ${label}</span><h2>piano_sampler~</h2></div></div><div class="module-actions"><span class="module-led"></span><button class="icon-button remove-button" type="button" aria-label="Remove ${label}">×</button></div></div>
    <div class="module-flow"><span>SAMPLED KEYS / STEREO</span><button class="port output-port" type="button" aria-label="Connect piano output">OUT</button></div>
    <div class="module-section piano-bank"><div class="section-title">PIANO KEY BANK</div><div class="piano-bank-summary">Reading bank…</div><button class="mini-button piano-refresh" type="button">REFRESH BANK</button><p class="piano-hint">Samples/piano · SFZ maps key ranges, root pitches and sustain loops. Missing recorded keys are pitched automatically within those ranges. C4 = MIDI 60.</p></div>
    <div class="module-section piano-gestures"><div class="section-title">OCCASIONAL CHORD GESTURES</div><div class="piano-gesture-summary"></div><details><summary>EDIT GESTURE JSON</summary><textarea class="piano-program" rows="9" spellcheck="false" aria-label="${label} gesture JSON"></textarea><button class="mini-button piano-program-apply" type="button">APPLY GESTURES</button><p class="piano-hint">Each note has midi, offsetMs, and velocity (0.05–1). First offset is 0; tiny offsets roll the chord. The LLM composes this same format.</p></details></div>
    <div class="module-section transport-section"><button class="module-play" type="button" disabled>▶ <span>PLAY</span></button><button class="module-strike piano-preview" type="button" disabled>PREVIEW</button><span class="module-status" role="status">Waiting for piano samples</span></div><div class="module-controls"></div><div class="module-foot"><span>OUT L / R</span><span>DRY SOURCE</span></div>`;
  const query = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const controls = query<HTMLElement>('.module-controls');
  const gesturesHeading = query<HTMLElement>('.piano-gestures > .section-title');
  gesturesHeading.classList.add('parameter-lock-heading'); createParameterLock(gesturesHeading, 'gestures');
  const play = query<HTMLButtonElement>('.module-play'), preview = query<HTMLButtonElement>('.piano-preview');
  const refresh = query<HTMLButtonElement>('.piano-refresh'), apply = query<HTMLButtonElement>('.piano-program-apply');
  const editor = query<HTMLTextAreaElement>('.piano-program');
  editor.addEventListener('input', onManualEdit);
  const lfos: ParameterLfoMap = {}; const widgets = new Map<keyof PianoParameters, ParameterLfoControl>();
  let operation = 0;
  function status(text: string, error = false): void { const target = query<HTMLElement>('.module-status'); target.textContent = text; target.classList.toggle('error', error); }
  function update(): void {
    const bank = engine.currentBank, gestures = engine.currentGestures;
    const keys = bank.samples.map((sample) => sample.midi);
    const recordings = new Set(bank.samples.map((sample) => sample.filename)).size;
    query<HTMLElement>('.piano-bank-summary').textContent = keys.length ? `${bank.name} · ${keys.length} playable keys / ${recordings} recordings · ${pianoNoteName(Math.min(...keys))}–${pianoNoteName(Math.max(...keys))}${bank.sfz ? ' · SFZ' : ''}` : 'No piano samples yet';
    const summary = query<HTMLElement>('.piano-gesture-summary'); summary.replaceChildren();
    for (const gesture of gestures) {
      const line = document.createElement('p'); line.textContent = `${gesture.label}: ${gesture.notes.map((note) => `${pianoNoteName(note.midi)} +${note.offsetMs}ms`).join(' · ')}`; summary.append(line);
    }
    if (!gestures.length) summary.textContent = 'Provide at least two key samples, then refresh. Composition will use only available notes.';
    editor.value = JSON.stringify(gestures, null, 2);
    play.disabled = preview.disabled = !gestures.length;
    play.innerHTML = engine.isPlaying ? '■ <span>STOP</span>' : '▶ <span>PLAY</span>';
    play.classList.toggle('active', engine.isPlaying); query<HTMLElement>('.module-led').classList.toggle('active', engine.isPlaying);
    onStateChange();
  }
  for (const control of pianoControls) {
    const row = document.createElement('div'); row.className = 'control'; row.title = control.moodEffect;
    const format = (value: number) => `${Number(value.toFixed(2))}${control.unit ? ` ${control.unit}` : ''}`;
    row.innerHTML = `<span class="control-heading"><span class="control-label">${control.label}</span><output></output></span><input data-param="${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${engine.currentParameters[control.key]}" aria-label="${label} ${control.label}" />`;
    const input = row.querySelector('input')!;
    widgets.set(control.key, new ParameterLfoControl(row.querySelector<HTMLElement>('.control-heading')!, control.key, input,
      (settings) => { lfos[control.key] = settings; engine.setParameterLfos(lfos); }, format));
    input.addEventListener('input', () => { onManualEdit(); engine.setParameter(control.key, Number(input.value)); });
    controls.append(row);
  }
  async function refreshBank(): Promise<void> {
    const token = ++operation; refresh.disabled = apply.disabled = true; status('Preparing piano key samples…');
    try {
      const bank = await requestPianoBank();
      const firstBank = !engine.currentBank.revision;
      let gestures = engine.currentGestures;
      try { gestures = parsePianoGestures(gestures, bank.samples.map((sample) => sample.midi)); }
      catch { gestures = initialPianoGestures(bank.samples.map((sample) => sample.midi)); }
      const prepared = await engine.prepareProgram(bank, gestures);
      if (token !== operation || !root.isConnected) return;
      if (!gestures.length) engine.stop();
      prepared.commit();
      if (firstBank && bank.defaultReleaseSeconds !== undefined) {
        engine.setParameter('releaseSeconds', bank.defaultReleaseSeconds);
        widgets.get('releaseSeconds')!.setBase(engine.currentParameters.releaseSeconds);
      }
      update();
      status(gestures.length ? `Ready. ${bank.warnings?.length ? bank.warnings[0] : 'Press PLAY for unhurried chord appearances.'}` : bank.warnings?.[0] ?? 'Add at least two piano keys to Samples/piano, then REFRESH BANK.');
    } catch (error) { if (token === operation && root.isConnected) status(error instanceof Error ? error.message : String(error), true); }
    finally { if (token === operation) refresh.disabled = apply.disabled = false; }
  }
  refresh.addEventListener('click', () => { onManualEdit(); void refreshBank(); });
  apply.addEventListener('click', async () => {
    onManualEdit(); const token = ++operation; refresh.disabled = apply.disabled = true;
    try {
      const gestures = parsePianoGestures(JSON.parse(editor.value), engine.currentBank.samples.map((sample) => sample.midi), label);
      const prepared = await engine.prepareProgram(engine.currentBank, gestures);
      if (token !== operation || !root.isConnected) return;
      prepared.commit(); update(); status('Gestures applied. Existing notes finish; the next appearance uses the new chords.');
    } catch (error) { status(error instanceof Error ? error.message : String(error), true); }
    finally { if (token === operation) refresh.disabled = apply.disabled = false; }
  });
  async function start(): Promise<void> { await engine.start(); update(); status('Occasional chords running'); }
  play.addEventListener('click', async () => {
    onManualEdit();
    if (engine.isPlaying) { engine.stop(); update(); status('Stopped'); return; }
    try { await start(); } catch (error) { status(error instanceof Error ? error.message : String(error), true); }
  });
  preview.addEventListener('click', async () => { try { await engine.preview(); status('Previewing first gesture'); } catch (error) { status(String(error), true); } });
  query<HTMLButtonElement>('.remove-button').addEventListener('click', () => { operation++; onRemove(id); });
  if (initial) { engine.installProgram(initial); update(); status(initial.gestures.length ? 'Ready' : 'Add piano samples and REFRESH BANK.'); }
  else void refreshBank();
  return { kind: 'piano_sampler', root, outputPort: query('.output-port'), label, engine, lfos,
    getSnapshot: () => ({ id, type: 'piano_sampler', label, playing: engine.isPlaying, parameters: engine.currentParameters, bank: engine.currentBank, gestures: engine.currentGestures }),
    applyParameters(parameters) {
      for (const control of pianoControls) { engine.setParameter(control.key, parameters[control.key]); widgets.get(control.key)!.setBase(parameters[control.key]); }
    },
    applyLfos(settings) { for (const control of pianoControls) if (settings[control.key]) widgets.get(control.key)!.applySettings(settings[control.key]); },
    async prepareGestures(gestures, signal) {
      const token = operation; const prepared = await engine.prepareProgram(engine.currentBank, gestures, signal);
      return { validate() { if (operation !== token) throw new Error(`${label}: piano bank changed`); prepared.validate(); },
        commit() { if (operation !== token) throw new Error(`${label}: piano bank changed`); prepared.commit(); update(); } };
    },
    start, stop() { engine.stop(); update(); status('Stopped'); },
  };
}
