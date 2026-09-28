/** One worker clock per mobile rack. Audio events still run on the audio clock;
 * this only keeps scheduling less dependent on throttled window timers.
 * An OS that freezes the whole browser can still interrupt playback. */
const clocks = new WeakMap<AudioContext, { callbacks: Set<() => void>; worker?: Worker; fallback?: number; tick: () => void; visibility: () => void }>();

export function configureMobileClock(context: AudioContext): void {
  const callbacks = new Set<() => void>();
  const tick = () => { for (const callback of callbacks) callback(); };
  const visibility = () => { clock.worker?.postMessage(document.hidden ? 250 : 100); tick(); };
  const clock: { callbacks: Set<() => void>; worker?: Worker; fallback?: number; tick: () => void; visibility: () => void } = { callbacks, tick, visibility };
  const url = URL.createObjectURL(new Blob([`
    let timer;
    onmessage = ({ data: interval }) => { clearInterval(timer); timer = setInterval(() => postMessage(0), interval); };
  `], { type: 'text/javascript' }));
  const fallback = () => {
    clock.worker?.terminate(); clock.worker = undefined;
    clock.fallback ??= window.setInterval(tick, 100);
  };
  try { clock.worker = new Worker(url); clock.worker.onmessage = tick; clock.worker.onerror = fallback; }
  catch { fallback(); }
  finally { URL.revokeObjectURL(url); }
  clocks.set(context, clock);
  visibility();
  document.addEventListener('visibilitychange', visibility);
}

export function audioLookAhead(context: AudioContext, normal: number): number {
  return clocks.has(context) ? (document.hidden ? 1.5 : 0.4) : normal;
}

export function usesMobileClock(context: AudioContext): boolean { return clocks.has(context); }

export function startAudioClock(context: AudioContext, callback: () => void, interval: number): () => void {
  const clock = clocks.get(context);
  if (clock) { clock.callbacks.add(callback); return () => { clock.callbacks.delete(callback); }; }
  const timer = window.setInterval(callback, interval);
  return () => window.clearInterval(timer);
}

export function disposeAudioClock(context: AudioContext): void {
  const clock = clocks.get(context);
  if (!clock) return;
  clock.worker?.terminate(); window.clearInterval(clock.fallback);
  document.removeEventListener('visibilitychange', clock.visibility);
  clock.callbacks.clear(); clocks.delete(context);
}
