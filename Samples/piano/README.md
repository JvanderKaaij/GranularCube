# Piano sample bank

## SFZ instruments

The supplied `UprightPianoKW-small-bright-20190703.sfz` maps 26 recordings across
all 88 keys, A0 (MIDI 21) through C8 (MIDI 108). The sampler follows `lokey`,
`hikey`, and `pitch_keycenter`, pitching each recording for the requested note.
It also reads the lower regions' continuous sustain loops and the 0.6-second
default release. Higher regions use their natural decay without looping.

A single SFZ here is selected automatically. Its sample paths may reference
subfolders; for this flattened bank, `samples/` references also resolve to the
existing WAVs directly in this folder. Missing files cause an error. If several
SFZ files are present, select one with `bank.json`:

```json
{ "sfz": "UprightPianoKW-small-bright-20190703.sfz" }
```

Supported SFZ opcodes: `sample`, `key`, `lokey`, `hikey`, `pitch_keycenter`,
`loop_mode` (`no_loop` or `loop_continuous`), `loop_start`, `loop_end`, and
`ampeg_release`, inherited through `<global>`, `<group>`, and `<region>`.
`<control> default_path` is also supported. Loop points use original WAV frame
indices, so they remain correct when the browser resamples audio. This first
version supports one layer per playable key; overlapping zones, velocity layers,
includes, and other synthesis opcodes are rejected rather than silently ignored.

## Simple key mapping

With no SFZ, put one recording per piano key in this folder. Note names use C4 = MIDI 60:
`A3.wav`, `C4.wav`, `C#4.wav`, `Db4.wav`, or MIDI filenames such as `57.wav`.
Optional prefixes work when separated by an underscore, space, or hyphen, e.g. `piano_A3.wav`.
Keys from A0 (MIDI 21) through C8 (MIDI 108) are supported.

For other filenames or a different octave naming convention, create `bank.json`:

```json
{
  "name": "My piano",
  "samples": [
    { "midi": 57, "filename": "my-recording-A3.wav" },
    { "midi": 60, "filename": "my-recording-C4.wav" }
  ]
}
```

An explicit `samples` array takes precedence over SFZ discovery. The manifest
lists every key you want available. Optional `rootMidi` sets the recording's
original pitch when it differs from the playable `midi`; without it the note
plays at its recorded pitch. Choose one sample per MIDI key; velocity selects
note level in this first version, rather than a recording layer.
WAV, AIFF, MP3, M4A, and OGG are accepted if the browser can decode them.
After adding files, click **REFRESH BANK** on `piano_sampler~`. Samples are served
directly by the Python server; a web rebuild is not required.
