export interface ParameterLfoSettings {
  enabled: boolean;
  periodSeconds: number;
  depth: number;
  waveform: 'sine' | 'triangle';
  phaseRadians: number;
}

export type ParameterLfoMap = Record<string, ParameterLfoSettings>;

const activeByDefault = new Set(['density', 'rate', 'brightness', 'spread', 'cutoff', 'gain']);

export function defaultParameterLfo(key: string): ParameterLfoSettings {
  const isModuleGain = key === 'gain';
  return {
    enabled: activeByDefault.has(key),
    periodSeconds: isModuleGain ? 160 + (hash(key) % 81) : 72 + (hash(key) % 55),
    depth: isModuleGain ? 0.55 : 0.8,
    waveform: 'sine',
    phaseRadians: Math.random() * Math.PI * 2,
  };
}

export function parameterLfoValue(base: number, key: string, settings: ParameterLfoSettings | undefined, timeSeconds: number, min: number, max: number): number {
  if (!settings?.enabled || settings.depth <= 0) return base;
  const period = Math.max(10, settings.periodSeconds);
  const phase = settings.phaseRadians ?? hash(key) / 0xffffffff * Math.PI * 2;
  const sine = Math.sin(timeSeconds * Math.PI * 2 / period + phase);
  const wave = settings.waveform === 'triangle' ? (2 / Math.PI) * Math.asin(sine) : sine;
  // Depth is a fraction of the base, capped to 25% for a slow, musical drift.
  const span = Number.isFinite(max - min) ? max - min : Math.abs(base);
  const swing = Math.max(Math.abs(base) * 0.12, span * 0.02);
  const amount = wave * Math.min(Math.abs(base) * 0.25 + span * 0.02, swing * Math.max(0, settings.depth));
  return Math.max(min, Math.min(max, base + amount));
}

export function parameterLfoHash(key: string): number {
  return hash(key);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}
