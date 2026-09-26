/** Built-in samples available to granular modules and mood requests. */
export const sampleCatalog = [
  { label: 'Violin', file: 'violin.wav', note: null },
  { label: 'Soft piano loop', file: 'soft_piano_loop_160bpm.wav', note: null },
  { label: 'Soft piano loop two', file: 'soft_piano_loop_two.wav', note: null },
  { label: 'Exotic animals', file: 'exotic_animals.wav', note: null },
  { label: 'Children’s choir', file: 'choir_children.wav', note: null },
  { label: 'Choir · key D', file: 'choir_key_d.wav', note: 'D' },
  { label: 'Serbian Orthodox choir', file: 'choir_serbian_orthodox.wav', note: null },
  { label: 'Egg Shaker', file: 'egg_shaker.wav', note: null },
  { label: 'African Drums', file: 'african_drums.wav', note: null },
  { label: 'Clarinet D4', file: 'clarinet_key_d4.wav', note: 'D4' },
  { label: 'Violin D4', file: 'violin_key_d.wav', note: 'D4' },
  { label: 'Bass Guitar D4', file: 'bass_guitar_d.wav', note: 'D4' },
  { label: 'Piano D4', file: 'piano_key_d.wav', note: 'D4' },
  { label: 'Accordion D', file: 'hammond_d.wav', note: 'D' },
  { label: 'Flute D4', file: 'flute_d4.wav', note: 'D4' },
] as const;

// Editorial starting tags inferred from the named sources, not measured acoustic features.
const tags: Record<string, string[]> = {
  'violin.wav': ['sustained', 'tonal', 'bowed', 'expressive', 'texture', 'bed'],
  'soft_piano_loop_160bpm.wav': ['tonal', 'transient', 'soft', 'rhythmic', 'loop', 'accent'],
  'soft_piano_loop_two.wav': ['tonal', 'soft', 'rhythmic', 'loop', 'reflective', 'accent'],
  'exotic_animals.wav': ['organic', 'recognizable', 'irregular', 'noisy', 'focal'],
  'choir_children.wav': ['sustained', 'vocal', 'airy', 'luminous', 'bed'],
  'choir_key_d.wav': ['sustained', 'vocal', 'tonal', 'spacious', 'bed'],
  'choir_serbian_orthodox.wav': ['sustained', 'vocal', 'solemn', 'resonant', 'bed'],
  'egg_shaker.wav': ['transient', 'noisy', 'dry', 'rhythmic', 'texture', 'accent'],
  'african_drums.wav': ['transient', 'percussive', 'rhythmic', 'earthy', 'accent'],
  'clarinet_key_d4.wav': ['tonal', 'sustained', 'woody', 'warm', 'focal'],
  'violin_key_d.wav': ['tonal', 'sustained', 'bowed', 'expressive', 'texture'],
  'bass_guitar_d.wav': ['tonal', 'plucked', 'transient', 'rounded', 'accent'],
  'piano_key_d.wav': ['tonal', 'transient', 'resonant', 'reflective', 'accent'],
  'hammond_d.wav': ['tonal', 'sustained', 'reedy', 'warm', 'bed'],
  'flute_d4.wav': ['tonal', 'sustained', 'breathy', 'light', 'focal'],
};
export const taggedSampleCatalog = sampleCatalog.map((sample) => ({ ...sample, tags: tags[sample.file],
  tagBasis: 'source-label inference; pitch is unverified except where note is supplied' }));
