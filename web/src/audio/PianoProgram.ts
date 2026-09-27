export interface PianoSample {
  midi: number; filename: string; rootMidi?: number;
  loopMode?: 'no_loop' | 'loop_continuous'; loopStartSeconds?: number; loopEndSeconds?: number;
}
export interface PianoBank {
  name: string; revision: string; samples: PianoSample[]; warnings?: string[];
  sfz?: string; defaultReleaseSeconds?: number;
}
export interface PianoNote { midi: number; offsetMs: number; velocity: number }
export interface PianoGesture { label: string; notes: PianoNote[] }
export interface PianoParameters {
  gapMinSeconds: number; gapMaxSeconds: number; holdSeconds: number; releaseSeconds: number; spread: number; gain: number;
}
export const pianoDefaults: PianoParameters = { gapMinSeconds: 6, gapMaxSeconds: 30, holdSeconds: 6, releaseSeconds: 3, spread: 0.35, gain: 0.6 };
export const pianoControls: { key: keyof PianoParameters; label: string; min: number; max: number; step: number; unit?: string; moodEffect: string }[] = [
  { key: 'gapMinSeconds', label: 'Shortest pause', min: 6, max: 30, step: 1, unit: 's', moodEffect: 'Shortest interval between chord gestures, within 6–30 seconds. Leave time for the piano and connected effects to decay; this is not a beat rate.' },
  { key: 'gapMaxSeconds', label: 'Longest pause', min: 6, max: 30, step: 1, unit: 's', moodEffect: 'Longest interval between gestures, within 6–30 seconds. A wider interval range adds irregular appearances while keeping the piano present.' },
  { key: 'holdSeconds', label: 'Hold', min: 0.5, max: 20, step: 0.1, unit: 's', moodEffect: 'How long a note rings before its release fade. SFZ looped regions can sustain through this hold; unlooped notes decay naturally and end at the recording boundary.' },
  { key: 'releaseSeconds', label: 'Release', min: 0.2, max: 10, step: 0.1, unit: 's', moodEffect: 'Fade after the hold. Longer releases let cluster notes dissolve gently into the connected reverb.' },
  { key: 'spread', label: 'Stereo spread', min: 0, max: 1, step: 0.01, moodEffect: 'Width of the notes within a chord; lower pitches lean left and higher pitches right. Small values keep a contemplative piano cohesive.' },
  { key: 'gain', label: 'Module level', min: 0, max: 1, step: 0.01, moodEffect: 'Overall piano presence, independent of each note velocity. Keep it audible and use sparse gestures for space.' },
];
export function pianoNoteName(midi: number): string { return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`; }
export function validatePianoBank(bank: PianoBank): void {
  if (!bank || typeof bank.name !== 'string' || typeof bank.revision !== 'string' || !Array.isArray(bank.samples) || bank.samples.length > 88) throw new Error('Invalid piano sample bank');
  if ((bank.sfz !== undefined && typeof bank.sfz !== 'string') || (bank.defaultReleaseSeconds !== undefined &&
    (!Number.isFinite(bank.defaultReleaseSeconds) || bank.defaultReleaseSeconds < 0 || bank.defaultReleaseSeconds > 10))) throw new Error('Invalid piano SFZ metadata');
  const seen = new Set<number>();
  for (const sample of bank.samples) {
    if (!sample || !Number.isInteger(sample.midi) || sample.midi < 21 || sample.midi > 108 || seen.has(sample.midi) ||
      typeof sample.filename !== 'string' || /[:\\]/.test(sample.filename) || sample.filename.split('/').some((part) => !part || part === '.' || part === '..') ||
      !/\.(wav|aif|aiff|mp3|m4a|ogg)$/i.test(sample.filename)) throw new Error('Piano bank needs unique MIDI keys and valid sample filenames');
    if (sample.rootMidi !== undefined && (!Number.isInteger(sample.rootMidi) || sample.rootMidi < 0 || sample.rootMidi > 127)) throw new Error('Piano sample rootMidi must be MIDI 0–127');
    if (sample.loopMode !== undefined && sample.loopMode !== 'no_loop' && sample.loopMode !== 'loop_continuous') throw new Error('Unsupported piano loop mode');
    if (sample.loopMode === 'loop_continuous' && (typeof sample.loopStartSeconds !== 'number' || typeof sample.loopEndSeconds !== 'number' ||
      !Number.isFinite(sample.loopStartSeconds) || !Number.isFinite(sample.loopEndSeconds) || sample.loopStartSeconds < 0 || sample.loopEndSeconds <= sample.loopStartSeconds)) throw new Error('Piano loop needs valid start/end seconds');
    seen.add(sample.midi);
  }
}
export function parsePianoGestures(value: unknown, available: readonly number[], label = 'Piano'): PianoGesture[] {
  if (!Array.isArray(value) || value.length > 8 || (available.length >= 2 && value.length < 1) || (available.length < 2 && value.length !== 0)) throw new Error(`${label}.gestures must contain ${available.length >= 2 ? '1–8 gestures' : 'no gestures until at least two keys are supplied'}`);
  return value.map((gesture, index) => {
    if (!gesture || typeof gesture !== 'object' || typeof gesture.label !== 'string' || !gesture.label.trim() || gesture.label.length > 120 || !Array.isArray(gesture.notes) || gesture.notes.length < 2 || gesture.notes.length > 8) throw new Error(`${label} gesture ${index + 1} needs a label and 2–8 notes`);
    const seen = new Set<number>();
    const notes: PianoNote[] = gesture.notes.map((note: PianoNote) => {
      if (!note || !Number.isInteger(note.midi) || !available.includes(note.midi) || seen.has(note.midi)) throw new Error(`${label}: MIDI ${note?.midi} has no available sample or is repeated in the gesture`);
      if (typeof note.offsetMs !== 'number' || !Number.isFinite(note.offsetMs) || note.offsetMs < 0 || note.offsetMs > 2000 ||
        typeof note.velocity !== 'number' || !Number.isFinite(note.velocity) || note.velocity < 0.05 || note.velocity > 1) throw new Error(`${label}: offsets must be 0–2000 ms and velocities 0.05–1`);
      seen.add(note.midi); return { midi: note.midi, offsetMs: note.offsetMs, velocity: note.velocity };
    });
    notes.sort((a, b) => a.offsetMs - b.offsetMs);
    if (notes[0].offsetMs !== 0) throw new Error(`${label}: each gesture must begin at offsetMs=0`);
    return { label: gesture.label.trim(), notes };
  });
}

/** A playable initial voicing using only real keys; composition prompts contain no example chords. */
export function initialPianoGestures(keys: number[]): PianoGesture[] {
  if (keys.length < 2) return [];
  const chosen = new Set<number>();
  for (const target of [57, 60, 64, 69]) {
    const note = [...keys].filter((key) => !chosen.has(key)).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    if (note !== undefined) chosen.add(note);
  }
  return [{ label: 'Initial spacious voicing', notes: [...chosen].sort((a, b) => a - b).map((midi, index) => ({ midi, offsetMs: index * 60, velocity: 0.5 })) }];
}
