import type { PhysicalParameters } from '../parameters';

/** Bell and string are melodic modes; percussion retains independent echo settings. */
export function fitAtmosphericDelay(parameters: PhysicalParameters): PhysicalParameters {
  if (parameters.model === 'percussion') return { ...parameters };
  return { ...parameters, delayMix: Math.max(0.55, parameters.delayMix),
    delayFeedback: Math.max(0.58, parameters.delayFeedback),
    delayTime: Math.max(0.5, Math.min(1.2, parameters.delayTime)) };
}
