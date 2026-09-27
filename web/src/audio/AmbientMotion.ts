import type { Parameters, PhysicalParameters } from '../parameters';
import { parameterLfoValue, type ParameterLfoMap } from './ParameterLfo';

export interface Movement { amount: number; periodSeconds: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const granularBounds: Record<string, [number, number]> = { density: [0.1, 60], lengthMin: [5, 2000], lengthMax: [5, 2000], ampMin: [0, 1], ampMax: [0, 1], selectionStart: [0, Infinity], selectionEnd: [0, Infinity], filterFreqMin: [20, 20000], filterFreqMax: [20, 20000], filterQMin: [0.1, 10], filterQMax: [0.1, 10], gain: [0, 1] };
const physicalBounds: Record<string, [number, number]> = { rootNote: [48, 84], rate: [0.2, 3], decay: [0.5, 10], softness: [0, 1], strikePosition: [0.05, 0.95], noiseAmount: [0, 1], noiseColor: [0, 1], noiseDecay: [0.02, 0.8], inharmonicity: [0, 1], brightness: [0, 1], damping: [0, 1], beating: [0, 1], body: [0, 1], spread: [0, 1], gain: [0, 1] };

/** Bounded offsets around the authored patch; never accumulates parameter drift. */
export class AmbientMotion {
  private config: Movement | null = null;
  private start = 0;
  enabled = true;
  private lfos: ParameterLfoMap = {};
  constructor(private readonly seed: number) {}
  get currentSettings(): Movement | null { return this.config ? { ...this.config } : null; }
  set(config: Movement | null, time: number): void { this.config = config; this.start = time; }
  setParameterLfos(settings: ParameterLfoMap): void { this.lfos = structuredClone(settings); }
  private wave(time: number, lane: number): number {
    if (!this.enabled || !this.config) return 0;
    const elapsed = Math.max(0, time - this.start);
    return Math.sin(elapsed * Math.PI * 2 / (this.config.periodSeconds * (1 + lane * 0.37)) + this.seed * 2.399 + lane)
      * this.config.amount * Math.min(1, elapsed / 10);
  }
  pan(time: number): number { return this.wave(time, 4) * 0.45; }
  granular(base: Parameters, time: number, durationMs: number): Parameters {
    const cutoff = 2 ** (this.wave(time, 1) * 0.6);
    const width = (base.selectionEnd - base.selectionStart) * (1 - Math.abs(this.wave(time, 2)) * 0.2);
    const start = clamp(base.selectionStart + this.wave(time, 2) * durationMs * 0.08, 0, Math.max(0, durationMs - width));
    const result = { ...base };
    for (const [key, [min, max]] of Object.entries(granularBounds)) {
      const rangeMax = max === Infinity ? durationMs : max;
      result[key as keyof Parameters] = parameterLfoValue(Number(base[key as keyof Parameters]), key, this.lfos[key], time, min, rangeMax) as never;
    }
    const lfoWidth = Math.max(0, Math.min(durationMs, width));
    const lfoStart = clamp(start + (result.selectionStart - base.selectionStart), 0, Math.max(0, durationMs - lfoWidth));
    const density = clamp(result.density * (1 + this.wave(time, 0) * 0.25), 0.1, 60);
    const lengthMin = Math.min(result.lengthMin, result.lengthMax);
    const lengthMax = Math.max(result.lengthMin, result.lengthMax);
    const ampMin = Math.min(result.ampMin, result.ampMax);
    const ampMax = Math.max(result.ampMin, result.ampMax);
    const cutoffMin = Math.min(result.filterFreqMin, result.filterFreqMax);
    const cutoffMax = Math.max(result.filterFreqMin, result.filterFreqMax);
    return { ...result, density, lengthMin, lengthMax, ampMin, ampMax,
      filterFreqMin: clamp(cutoffMin * cutoff, 20, 20000), filterFreqMax: clamp(cutoffMax * cutoff, 20, 20000),
      selectionStart: clamp(lfoStart, 0, durationMs), selectionEnd: clamp(result.selectionEnd, lfoStart, durationMs) };
  }
  physical(base: PhysicalParameters, time: number): PhysicalParameters {
    const result = { ...base };
    for (const [key, [min, max]] of Object.entries(physicalBounds)) {
      result[key as keyof PhysicalParameters] = parameterLfoValue(Number(base[key as keyof PhysicalParameters]), key, this.lfos[key], time, min, max) as never;
    }
    return { ...result, rate: clamp(result.rate * (1 + this.wave(time, 0) * 0.2), 0.2, 3),
      brightness: clamp(result.brightness + this.wave(time, 1) * 0.12, 0, 1),
      spread: clamp(result.spread + this.wave(time, 3) * 0.15, 0, 1) };
  }
}
