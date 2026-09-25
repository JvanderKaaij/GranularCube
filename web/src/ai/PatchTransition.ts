import type { Parameters } from '../parameters';

export const PATCH_TRANSITION_MS = 2200;

/** Smoothly moves numeric settings; note roots and filter modes switch midway. */
export function morphParameters<T extends object>(
  from: T,
  to: T,
  progress: number,
  discreteKeys: readonly string[] = [],
): T {
  const amount = Math.max(0, Math.min(1, progress));
  const eased = amount * amount * (3 - 2 * amount);
  const result = { ...to } as Record<string, unknown>;
  for (const key of Object.keys(to) as Array<keyof T & string>) {
    const start = from[key];
    const end = to[key];
    result[key] = discreteKeys.includes(key) || typeof start !== 'number' || typeof end !== 'number'
      ? amount < 0.5 ? start : end
      : start + (end - start) * eased;
  }
  return result as T;
}

/** A zero-length selection requests the whole newly selected sample. */
export function fitSampleWindow(parameters: Parameters, durationMs: number, sampleChanged: boolean): Parameters {
  if (!sampleChanged) return { ...parameters };
  const start = Math.min(parameters.selectionStart, durationMs);
  const end = Math.min(parameters.selectionEnd, durationMs);
  return start >= end
    ? { ...parameters, selectionStart: 0, selectionEnd: durationMs }
    : { ...parameters, selectionStart: start, selectionEnd: end };
}
