interface MotifMood { brightness: number; movement: number; warmth: number; tension: number }

/** Preserve a composed motif unless it repeats the active pattern exactly. */
export function freshPhysicalSequence(requested: number[], current: number[], rootNote: number, mood: MotifMood): number[] {
  const sequence = [...requested];
  if (sequence.length !== current.length || sequence.some((note, index) => note !== current[index])) return sequence;

  // Keep the opening anchor and the model's pitch classes. Change one internal note
  // by a nearby interval, so a repeated response still creates a new melodic contour.
  const pitchClasses = new Set(sequence.map((note) => ((note % 12) + 12) % 12));
  if (pitchClasses.size < 2) {
    const palette = mood.tension > 0.55 || mood.warmth < 0.4 ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    const anchor = ((sequence[0] % 12) + 12) % 12;
    for (const note of palette) pitchClasses.add((anchor + note) % 12);
  }
  const index = Math.min(sequence.length - 2, Math.max(1, Math.round((sequence.length - 1) * (0.35 + 0.3 * mood.movement))));
  const original = sequence[index];
  const upward = mood.brightness >= 0.5;
  const candidates = Array.from({ length: 37 }, (_, offset) => offset - 12).filter((note) =>
    note !== original && rootNote + note >= 48 && rootNote + note <= 96 && pitchClasses.has(((note % 12) + 12) % 12));
  candidates.sort((a, b) => {
    const score = (note: number) => Math.abs(note - original) +
      ((note > original) === upward ? 0 : 2) +
      0.15 * (Math.abs(note - sequence[index - 1]) + Math.abs(note - sequence[index + 1]));
    return score(a) - score(b) || a - b;
  });
  // Validated offsets and a root in 48–84 always leave another legal palette note.
  sequence[index] = candidates[0];
  return sequence;
}
