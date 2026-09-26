export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface Parameters {
  density: number;
  lengthMin: number;
  lengthMax: number;
  ampMin: number;
  ampMax: number;
  selectionStart: number;
  selectionEnd: number;
  filterFreqMin: number;
  filterFreqMax: number;
  filterQMin: number;
  filterQMax: number;
  filterType: FilterType;
  reverbMix: number;
  reverbDecay: number;
  reverbShimmer: number;
  gain: number;
}

export interface MasterParameters {
  reverbMix: number;
  reverbDecay: number;
  gain: number;
}

export type PhysicalModel = 'bell' | 'percussion' | 'string';

export interface PhysicalParameters {
  model: PhysicalModel;
  filterType: FilterType;
  filterCutoff: number;
  filterResonance: number;
  rootNote: number;
  rate: number;
  decay: number;
  softness: number;
  strikePosition: number;
  noiseAmount: number;
  noiseColor: number;
  noiseDecay: number;
  inharmonicity: number;
  brightness: number;
  damping: number;
  beating: number;
  body: number;
  spread: number;
  delayMix: number;
  delayTime: number;
  delayFeedback: number;
  reverbMix: number;
  reverbDecay: number;
  gain: number;
}

export const defaults: Parameters = {
  density: 6,
  lengthMin: 100,
  lengthMax: 200,
  ampMin: 0.5,
  ampMax: 1,
  selectionStart: 0,
  selectionEnd: 0,
  filterFreqMin: 200,
  filterFreqMax: 20000,
  filterQMin: 0.5,
  filterQMax: 0.5,
  filterType: 'lowpass',
  reverbMix: 0.28,
  reverbDecay: 7,
  reverbShimmer: 0.35,
  gain: 0.2,
};

export const masterDefaults: MasterParameters = {
  reverbMix: 0.6,
  reverbDecay: 2.8,
  gain: 1,
};

export const physicalDefaults: PhysicalParameters = {
  model: 'bell',
  filterType: 'lowpass',
  filterCutoff: 12000,
  filterResonance: 0.7,
  rootNote: 60,
  rate: 0.8,
  decay: 2.4,
  softness: 0.75,
  strikePosition: 0.28,
  noiseAmount: 0.22,
  noiseColor: 0.48,
  noiseDecay: 0.06,
  inharmonicity: 1,
  brightness: 0.6,
  damping: 0.25,
  beating: 0.08,
  body: 0.2,
  spread: 0.35,
  delayMix: 0.62,
  delayTime: 0.75,
  delayFeedback: 0.65,
  reverbMix: 0.25,
  reverbDecay: 6,
  gain: 0.28,
};

export type NumericParameter = Exclude<keyof Parameters, 'filterType'>;

export interface SingleControlDefinition {
  kind: 'single';
  key: NumericParameter;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface RangeControlDefinition {
  kind: 'range';
  keys: readonly [NumericParameter, NumericParameter];
  label: string;
  min: number;
  max: number;
  step: number;
  scale?: 'linear' | 'log';
  unit?: string;
  lowerLabel?: string;
  upperLabel?: string;
}

export type ControlDefinition = SingleControlDefinition | RangeControlDefinition;

export interface PhysicalControlDefinition {
  key: Exclude<keyof PhysicalParameters, 'model' | 'filterType'>;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface MasterControlDefinition {
  key: keyof MasterParameters;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export const masterControlDefinitions: MasterControlDefinition[] = [
  { key: 'reverbMix', label: 'WET / DRY', min: 0, max: 1, step: 0.01 },
  { key: 'reverbDecay', label: 'DECAY', min: 0.5, max: 6, step: 0.1, unit: ' s' },
  { key: 'gain', label: 'MASTER LEVEL', min: 0, max: 1.5, step: 0.01 },
];

export const granularControlGroups: { title: string; controls: ControlDefinition[]; filterSelect?: boolean }[] = [
  {
    title: 'Grain timing',
    controls: [
      { kind: 'single', key: 'density', label: 'Density', min: 0.1, max: 60, step: 0.1, unit: '/ sec' },
      { kind: 'range', keys: ['lengthMin', 'lengthMax'], label: 'Grain length', min: 5, max: 2000, step: 1, unit: 'ms' },
    ],
  },
  {
    title: 'Source window',
    controls: [
      { kind: 'range', keys: ['selectionStart', 'selectionEnd'], label: 'Start → end', min: 0, max: 1000, step: 1, unit: 'ms', lowerLabel: 'START', upperLabel: 'END' },
    ],
  },
  {
    title: 'Filter',
    filterSelect: true,
    controls: [
      { kind: 'range', keys: ['filterFreqMin', 'filterFreqMax'], label: 'Cutoff · log', min: 20, max: 20000, step: 1, scale: 'log', unit: 'Hz' },
      { kind: 'range', keys: ['filterQMin', 'filterQMax'], label: 'Q', min: 0.1, max: 10, step: 0.1 },
    ],
  },
  {
    title: 'Dynamics',
    controls: [
      { kind: 'range', keys: ['ampMin', 'ampMax'], label: 'Grain amplitude', min: 0, max: 1, step: 0.01 },
      { kind: 'single', key: 'gain', label: 'Module output', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Cloud / shimmer',
    controls: [
      { kind: 'single', key: 'reverbMix', label: 'Wet / dry', min: 0, max: 1, step: 0.01 },
      { kind: 'single', key: 'reverbDecay', label: 'Tail', min: 1, max: 12, step: 0.1, unit: 's' },
      { kind: 'single', key: 'reverbShimmer', label: 'Octave shimmer', min: 0, max: 1, step: 0.01 },
    ],
  },
];

export const physicalControlGroups: { title: string; controls: PhysicalControlDefinition[] }[] = [
  {
    title: 'Tone filter',
    controls: [
      { key: 'filterCutoff', label: 'Cutoff', min: 40, max: 20000, step: 1, unit: 'Hz' },
      { key: 'filterResonance', label: 'Resonance', min: 0.1, max: 12, step: 0.1, unit: 'Q' },
    ],
  },
  {
    title: 'Pitch / pattern',
    controls: [
      { key: 'rootNote', label: 'Root note', min: 48, max: 84, step: 1 },
      { key: 'rate', label: 'Pattern rate', min: 0.2, max: 3, step: 0.05, unit: '/ sec' },
    ],
  },
  {
    title: 'Exciter / noise',
    controls: [
      { key: 'softness', label: 'Mallet softness', min: 0, max: 1, step: 0.01 },
      { key: 'strikePosition', label: 'Strike position', min: 0.05, max: 0.95, step: 0.01 },
      { key: 'noiseAmount', label: 'Noise amount', min: 0, max: 1, step: 0.01 },
      { key: 'noiseColor', label: 'Noise color', min: 0, max: 1, step: 0.01 },
      { key: 'noiseDecay', label: 'Noise duration', min: 0.02, max: 0.8, step: 0.01, unit: 's' },
    ],
  },
  {
    title: 'Resonator',
    controls: [
      { key: 'decay', label: 'Ring time', min: 0.5, max: 10, step: 0.1, unit: 's' },
      { key: 'inharmonicity', label: 'Inharmonicity', min: 0, max: 1, step: 0.01 },
      { key: 'brightness', label: 'Brightness', min: 0, max: 1, step: 0.01 },
      { key: 'damping', label: 'High-mode damping', min: 0, max: 1, step: 0.01 },
      { key: 'beating', label: 'Mode beating', min: 0, max: 1, step: 0.01 },
      { key: 'body', label: 'Body resonance', min: 0, max: 1, step: 0.01 },
      { key: 'spread', label: 'Stereo spread', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Melodic delay',
    controls: [
      { key: 'delayMix', label: 'Echo level', min: 0, max: 0.8, step: 0.01 },
      { key: 'delayTime', label: 'Echo spacing', min: 0.05, max: 1.5, step: 0.01, unit: 's' },
      { key: 'delayFeedback', label: 'Repeat amount', min: 0, max: 0.78, step: 0.01 },
    ],
  },
  {
    title: 'Cloud reverb',
    controls: [
      { key: 'reverbMix', label: 'Wet / dry', min: 0, max: 1, step: 0.01 },
      { key: 'reverbDecay', label: 'Tail', min: 1, max: 12, step: 0.1, unit: 's' },
    ],
  },
  {
    title: 'Output',
    controls: [
      { key: 'gain', label: 'Module level', min: 0, max: 1, step: 0.01 },
    ],
  },
];

/** Source panels expose synthesis only; effects live in graph nodes. */
export const granularSourceGroups = granularControlGroups.filter(group => !['Filter', 'Cloud / shimmer'].includes(group.title));
export const physicalSourceGroups = physicalControlGroups.filter(group => !['Tone filter', 'Melodic delay', 'Cloud reverb'].includes(group.title));
