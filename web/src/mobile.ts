import './mobile.css';
import { HeadlessPatch } from './audio/HeadlessPatch';
import { listSetups, readSetup } from './config/SetupClient';
import type { PatchSetup } from './config/Setup';
import { OPENAI_MODELS, type ModelSelection } from './ai/OpenAIModels';
import { composePainting } from './ai/ComposePainting';
import { preparePhoto } from './mobile/PreparePhoto';

const app = document.querySelector<HTMLElement>('#app')!;
const cameraIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l1.5-2h5L16 5h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="4"/></svg>';
app.innerHTML = `
  <main class="museum-app">
    <header class="topbar"><a class="brand" href="./">granular<span>cube</span><small>MUSEUM PLAYER</small></a><button class="icon-button" id="settings-open" aria-label="Open setup and model settings" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></svg></button></header>
    <section class="intro"><div class="eyebrow">LOOK CLOSELY. LISTEN SLOWLY.</div><h1>A painting,<br>a place to listen.</h1><p>Let each artwork become an evolving soundscape.</p></section>
    <section class="artwork" aria-label="Selected artwork">
      <div class="artwork-empty"><div class="artwork-mark" aria-hidden="true"><i></i><i></i><i></i></div><span>Your next painting starts here.</span></div>
      <img id="painting-preview" alt="Selected painting" hidden />
      <div class="artwork-footer"><span id="painting-label">A MOMENT IN THE GALLERY</span><span id="painting-count">01 / ∞</span></div>
    </section>
    <section class="player" aria-label="Soundscape playback"><button id="listen" class="listen-button" disabled aria-label="Start listening">▶</button><div class="player-info"><span id="playback-label">Choose a sound setup</span><span id="setup-name">Loading your library…</span></div><div class="sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></section>
    <p id="playback-note" class="settings-hint" hidden></p>
    <section class="calculation" id="calculation" aria-busy="false"><div class="status-heading"><span class="status-dot" aria-hidden="true"></span><p id="status" role="status" aria-live="polite">Connecting…</p><span id="elapsed"></span></div><progress id="progress" aria-label="Composition progress" hidden></progress><p id="status-detail">Choose a saved setup to begin.</p><button id="cancel" class="text-button" hidden>Cancel composition</button></section>
    <section class="photo-actions"><button id="take-photo" class="primary-button" disabled>${cameraIcon}<span>Photograph artwork</span></button><div class="secondary-actions"><button id="choose-photo" class="text-button" disabled>Choose from photos</button><button id="retry" class="text-button" hidden>Compose again</button></div><input id="camera-file" type="file" accept="image/*" capture="environment" hidden /><input id="library-file" type="file" accept="image/*" hidden /></section>
    <section class="interpretation" id="interpretation" hidden><div class="eyebrow">THE SOUNDSCAPE</div><h2 id="mood"></h2><p id="scene"></p><span id="era"></span></section>
    <footer class="page-footer">Made for lingering.<span>Headphones recommended</span></footer>
  </main>
  <dialog id="settings" aria-labelledby="settings-title"><form method="dialog" class="settings-head"><div><span class="eyebrow">YOUR LISTENING SPACE</span><h2 id="settings-title">Settings</h2></div><button class="icon-button" aria-label="Close settings">×</button></form><div class="settings-body">
    <label for="setup-select">Sound setup</label><div class="setup-select-row"><select id="setup-select"><option value="">Choose a saved setup…</option></select><button id="refresh-setups" class="small-button" aria-label="Refresh saved setups">↻</button></div><p class="settings-hint">Saved in the desktop editor. Instruments, effects, motion and locked settings carry over.</p><button id="load-setup" class="primary-button">Load setup</button>
    <div class="settings-divider"></div><label for="image-model">Painting interpretation</label><select id="image-model"></select><label for="text-model">Musical composition</label><select id="text-model"></select><p class="settings-hint">Starts with the models saved in your setup. Changes apply to the next painting in this session.</p>
    <p id="settings-status" role="status"></p>
  </div></dialog>`;

const el = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const dialog = el<HTMLDialogElement>('#settings');
const setupSelect = el<HTMLSelectElement>('#setup-select');
const imageModel = el<HTMLSelectElement>('#image-model');
const textModel = el<HTMLSelectElement>('#text-model');
const listen = el<HTMLButtonElement>('#listen');
const status = el<HTMLParagraphElement>('#status');
const detail = el<HTMLParagraphElement>('#status-detail');
const progress = el<HTMLProgressElement>('#progress');
const preview = el<HTMLImageElement>('#painting-preview');
const retry = el<HTMLButtonElement>('#retry');
for (const select of [imageModel, textModel]) select.replaceChildren(...OPENAI_MODELS.map((model) => new Option(model.label, model.id)));

let player: HeadlessPatch | null = null;
let setup: PatchSetup | null = null;
let active: AbortController | null = null;
let busy = false;
let libraryBusy = false;
let transportBusy = false;
let photo: File | null = null;
let previewUrl: string | null = null;
let paintings = 0;
let startedAt = 0;
let wakeLock: WakeLockSentinel | null = null;
const recent: string[][] = [];

function message(text: string, secondary = '', error = false): void {
  status.textContent = text; detail.textContent = secondary;
  el('#calculation').classList.toggle('error', error);
}
function render(): void {
  const ready = Boolean(player && setup);
  listen.disabled = !ready || transportBusy;
  listen.textContent = player?.isPlaying ? 'Ⅱ' : '▶';
  listen.setAttribute('aria-label', player?.isPlaying ? 'Pause soundscape' : 'Start listening');
  el('#playback-label').textContent = !ready ? 'Choose a sound setup' : player?.isPlaying ? player.audioRunning ? 'Listening' : 'Tap to resume audio' : 'Ready when you are';
  el('.sound-bars').classList.toggle('playing', Boolean(player?.isPlaying && player.audioRunning));
  for (const selector of ['#take-photo', '#choose-photo']) el<HTMLButtonElement>(selector).disabled = !ready || busy;
  retry.hidden = !photo || busy; retry.disabled = !ready;
  el<HTMLButtonElement>('#load-setup').disabled = busy || libraryBusy || !setupSelect.value;
  el<HTMLButtonElement>('#refresh-setups').disabled = busy || libraryBusy;
  setupSelect.disabled = busy || libraryBusy;
  textModel.disabled = imageModel.disabled = busy || !ready;
  el('#calculation').classList.toggle('busy', busy);
  el('#calculation').setAttribute('aria-busy', String(busy));
  el('#cancel').hidden = !busy;
  if (!busy) { progress.hidden = true; el('#elapsed').textContent = ''; }
}

async function keepScreenAwake(): Promise<void> {
  if (!player?.isPlaying || document.visibilityState !== 'visible' || !('wakeLock' in navigator) || wakeLock) return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!player?.isPlaying) { await lock.release(); return; }
    wakeLock = lock; lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  }
  catch { /* Listening still works when the browser does not grant a screen lock. */ }
}
async function releaseScreen(): Promise<void> { await wakeLock?.release(); wakeLock = null; }
el('#settings-open').addEventListener('click', () => dialog.showModal());
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
setupSelect.addEventListener('change', render);
for (const select of [imageModel, textModel]) select.addEventListener('change', () => { el('#settings-status').textContent = 'Model choice updated for the next painting.'; });

async function refreshLibrary(): Promise<string | null> {
  libraryBusy = true; render();
  try {
    const library = await listSetups(); const selected = setupSelect.value;
    setupSelect.replaceChildren(new Option('Choose a saved setup…', ''), ...library.setups.map((item) => new Option(`${item.name}${item.id === library.defaultId ? ' · default' : ''}`, item.id)));
    if (library.setups.some((item) => item.id === selected)) setupSelect.value = selected;
    el('#settings-status').textContent = library.setups.length ? 'Choose the setup you want to hear.' : 'No setups yet. Save one in the desktop editor, then refresh this list.';
    return library.defaultId;
  } finally { libraryBusy = false; render(); }
}
el('#refresh-setups').addEventListener('click', () => { void refreshLibrary().catch((error) => { el('#settings-status').textContent = error.message; }); });

async function loadSetup(id: string, fromTap = false): Promise<void> {
  if (busy) return;
  const abort = new AbortController(); active = abort; busy = true; startedAt = performance.now();
  const timeout = window.setTimeout(() => abort.abort(new Error('Setup loading timed out.')), 120_000);
  let staged: HeadlessPatch | null = null;
  const continuePlaying = Boolean(player?.isPlaying);
  try {
    staged = new HeadlessPatch();
    // Unlock now while the load tap is active, even though loading recordings happens later.
    if (fromTap) void staged.unlock().catch(() => {});
    message('Loading the sound setup…', 'Preparing its instruments and recordings.');
    progress.hidden = false; progress.removeAttribute('value'); render();
    el('#settings-status').textContent = 'Loading setup…';
    const saved = await readSetup(id, abort.signal); abort.signal.throwIfAborted();
    if (!saved.setup.modules.length) throw new Error('This setup has no instruments. Choose another setup.');
    await staged.load(saved.setup, abort.signal); abort.signal.throwIfAborted();
    if (continuePlaying) await staged.start();
    abort.signal.throwIfAborted();
    const previous = player;
    player = staged; staged = null; setup = saved.setup;
    if (previous) await previous.dispose();
    recent.length = 0; paintings = 0; photo = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
    preview.hidden = true; preview.removeAttribute('src'); el<HTMLElement>('.artwork-empty').hidden = false; el('#interpretation').hidden = true;
    el('#painting-label').textContent = 'A MOMENT IN THE GALLERY'; el('#painting-count').textContent = '01 / ∞';
    setupSelect.value = saved.id; imageModel.value = saved.setup.models.image; textModel.value = saved.setup.models.text;
    el('#setup-name').textContent = saved.name; el('#settings-status').textContent = `Loaded “${saved.name}”.`;
    const url = new URL(location.href); url.searchParams.set('setup', saved.id); history.replaceState(null, '', url);
    message(continuePlaying ? 'Your setup is playing.' : 'Your listening space is ready.', 'Photograph an artwork to shape the next soundscape.');
    dialog.close(); void keepScreenAwake();
  } catch (error) {
    const text = abort.signal.aborted ? 'Setup loading canceled.' : error instanceof Error ? error.message : String(error);
    message(text, player ? 'Your previous setup is still available.' : 'Choose a saved setup in Settings.', !abort.signal.aborted);
    el('#settings-status').textContent = text;
  } finally {
    window.clearTimeout(timeout);
    if (staged) await staged.dispose();
    if (active === abort) active = null;
    busy = false; render();
  }
}
el('#load-setup').addEventListener('click', () => { if (setupSelect.value) void loadSetup(setupSelect.value, true); });

listen.addEventListener('click', async () => {
  if (!player || transportBusy) return;
  transportBusy = true;
  try {
    if (player.isPlaying && player.audioRunning) {
      active?.abort(); await player.pause(); await releaseScreen(); message('Paused.', 'Tap play whenever you’re ready to listen again.');
    } else {
      await player.start(); void keepScreenAwake();
      if (!busy) message('Take your time.', 'Photograph an artwork to shape the next soundscape.');
    }
  } catch (error) { message('Audio needs another tap.', error instanceof Error ? error.message : String(error), true); }
  finally { transportBusy = false; render(); }
});

function choosePhoto(selector: string): void {
  if (busy || !player) return;
  // Unlock audio from this user gesture before the operating system opens the camera.
  void player.unlock().catch(() => {});
  const input = el<HTMLInputElement>(selector); input.value = ''; input.click();
}
el('#take-photo').addEventListener('click', () => choosePhoto('#camera-file'));
el('#choose-photo').addEventListener('click', () => choosePhoto('#library-file'));
for (const selector of ['#camera-file', '#library-file']) el<HTMLInputElement>(selector).addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (file) void generate(file);
});
retry.addEventListener('click', () => { if (photo) { void player?.unlock().catch(() => {}); void generate(photo); } });
el('#cancel').addEventListener('click', () => active?.abort());

async function generate(file: File): Promise<void> {
  if (busy || !player || !setup) return;
  const engine = player; const settings = structuredClone(setup.mood);
  const models = { text: textModel.value, image: imageModel.value } as ModelSelection;
  const abort = new AbortController(); active = abort; busy = true; startedAt = performance.now();
  let timedOut = false;
  const timeout = window.setTimeout(() => { timedOut = true; abort.abort(); }, 300_000);
  const continuing = () => engine.isPlaying ? 'Your current soundscape continues while the next one is prepared.' : 'Tap play to listen while the painting is being composed.';
  render(); progress.hidden = false; progress.removeAttribute('value');
  try {
    message('Preparing your photograph…', continuing());
    photo = await preparePhoto(file, abort.signal);
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(photo);
    preview.src = previewUrl; preview.hidden = false; el<HTMLElement>('.artwork-empty').hidden = true;
    el('#painting-label').textContent = 'SELECTED ARTWORK';
    if (!engine.isPlaying) {
      // Audio was unlocked by the photo button; if interrupted by the camera, Play remains available.
      try { await engine.start(); void keepScreenAwake(); } catch { /* Calculation can finish while paused. */ }
    }
    abort.signal.throwIfAborted(); render();
    const before = JSON.stringify(engine.snapshot());
    const result = await composePainting(photo, engine.snapshot(), settings, models, recent.flat(), abort.signal,
      (_stage, text) => message(text, continuing()));
    abort.signal.throwIfAborted();
    if (player !== engine || before !== JSON.stringify(engine.snapshot())) throw new Error('The sound setup changed. Compose this painting again.');
    await engine.apply(result.composition.plan, result.generated, result.composition.movement, abort.signal, (phase, amount) => {
      if (phase === 'preparing') { progress.removeAttribute('value'); message('Preparing the new sounds…', continuing()); }
      else { progress.max = 100; progress.value = Math.round((amount ?? 0) * 100); message('Moving into the painting…', 'The instruments are slowly taking their new shape.'); }
    });
    abort.signal.throwIfAborted();
    paintings++; el('#painting-count').textContent = `${String(paintings).padStart(2, '0')} / ∞`;
    el('#painting-label').textContent = 'YOUR CURRENT PAINTING';
    el('#mood').textContent = result.brief.mood; el('#scene').textContent = result.brief.description; el('#era').textContent = result.brief.era;
    el('#interpretation').hidden = false;
    recent.push(result.composition.plan.modules.flatMap((module) => module.type === 'granular' ? [module.sample] : []));
    if (recent.length > 4) recent.shift();
    message('Stay with the painting.', engine.isPlaying ? 'Your soundscape will keep evolving. Photograph another artwork whenever you’re ready.' : 'Your new soundscape is ready. Tap play to listen.');
  } catch (error) {
    const canceled = abort.signal.aborted;
    message(timedOut ? 'This painting took too long.' : canceled ? 'Composition canceled.' : 'Couldn’t compose this painting.',
      timedOut ? 'Please try again.' : canceled ? 'The current soundscape is still available.' : error instanceof Error ? error.message : String(error), !canceled || timedOut);
  } finally { window.clearTimeout(timeout); if (active === abort) active = null; busy = false; render(); }
}

window.setInterval(() => {
  if (document.hidden) return;
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = player?.isPlaying ? 'playing' : 'paused';
  if (busy) el('#elapsed').textContent = `${Math.floor((performance.now() - startedAt) / 1000)}s`;
  const note = el('#playback-note'); note.hidden = !player?.warnings.length;
  if (!note.hidden) note.textContent = !window.isSecureContext ? 'Open this player over HTTPS to hear this setup’s spectral effect.' : player!.warnings.join(' ');
  render();
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && player?.isPlaying) {
    void player.unlock().catch(() => { message('Tap play to resume audio.', 'Your browser paused playback while the camera or another app was open.'); });
    void keepScreenAwake(); render();
  }
});
// Locking the screen must not be treated as pressing Pause.
window.addEventListener('pagehide', () => { void releaseScreen(); });
const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
if (audioSession) { try { audioSession.type = 'playback'; } catch { /* Older browser. */ } }
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({ title: 'Museum soundscape', artist: 'GranularCube' });
  navigator.mediaSession.setActionHandler('play', () => {
    if (!player) return;
    void player.start().then(() => { navigator.mediaSession.playbackState = 'playing'; render(); void keepScreenAwake(); }).catch(() => { message('Tap play to resume audio.', 'Your browser needs a tap to restart audio.'); });
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    active?.abort();
    void player?.pause().then(() => { navigator.mediaSession.playbackState = 'paused'; render(); void releaseScreen(); });
  });
}

async function initialize(): Promise<void> {
  try {
    const defaultId = await refreshLibrary();
    const id = new URL(location.href).searchParams.get('setup') || defaultId;
    if (id) await loadSetup(id);
    else { message('Choose your listening space.', 'Open Settings and load a setup saved in the desktop editor.'); el('#setup-name').textContent = 'No setup selected'; dialog.showModal(); }
  } catch (error) {
    message('The setup library is unavailable.', error instanceof Error ? error.message : String(error), true);
    el('#setup-name').textContent = 'Open Settings to retry'; el('#settings-status').textContent = detail.textContent; dialog.showModal();
  } finally { render(); }
}
void initialize();
