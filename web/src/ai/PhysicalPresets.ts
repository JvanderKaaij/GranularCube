import { physicalDefaults, type PhysicalModel, type PhysicalParameters } from '../parameters';

/** Complete, editable starting voices; the parameter stage returns only deliberate overrides. */
export const physicalPresets: Record<PhysicalModel, PhysicalParameters> = {
  bell: { ...physicalDefaults, model: 'bell', decay: 2.4, softness: 0.65, inharmonicity: 1, noiseAmount: 0.08, body: 0.12, gain: 0.15 },
  percussion: { ...physicalDefaults, model: 'percussion', decay: 0.7, softness: 0.18, strikePosition: 0.38,
    inharmonicity: 0.85, noiseAmount: 0.55, noiseColor: 0.35, noiseDecay: 0.04, brightness: 0.45,
    damping: 0.8, beating: 0, body: 0.35, rate: 0.65, delayMix: 0.06, delayFeedback: 0.12, reverbMix: 0.14, reverbDecay: 2.4, gain: 0.16 },
  string: { ...physicalDefaults, model: 'string', decay: 1.8, softness: 0.28, strikePosition: 0.22,
    inharmonicity: 0, noiseAmount: 0.04, noiseColor: 0.5, noiseDecay: 0.02, brightness: 0.5,
    damping: 0.55, beating: 0.025, body: 0.08, rate: 0.45, delayMix: 0.65, delayTime: 0.8, delayFeedback: 0.66, reverbMix: 0.28, reverbDecay: 4, gain: 0.14 },
};
