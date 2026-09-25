# GranularCube Web

A modular browser audio patch based on the Max project in the parent folder. It uses the built-in Web Audio API for sample playback, grain envelopes, per-grain filters, independent cloud reverbs for each module, and a stereo master reverb. The audio files in `../Samples` are copied into the web output.

## Run

```sh
cd web
npm install
npm run dev
```

Open the local address printed by the dev server. Each **granular~** module has independent sample, parameter, and playback controls. Use **+ ADD GRANULAR~** or **+ ADD BELL~** to run instruments in parallel, or **■ STOP ALL** to stop every module. Browsers require a click before audio output starts. Restart the dev server after adding or changing files in `../Samples`.

Controls are grouped by grain timing, source window, filter, and dynamics. Grain length, source position, filter cutoff, filter Q, and grain amplitude each use one two-handle range slider; either handle can be adjusted independently, and the endpoints cannot cross. Each grain picks a Q value from the selected range for its two filter stages.

The cutoff slider uses a logarithmic frequency scale from 20 Hz to 20 kHz, so 20–200 Hz, 200 Hz–2 kHz, and 2–20 kHz each occupy one third of the track. The other range sliders remain linear.

Each granular module also has its own **Cloud / shimmer** section. Its wet/dry control blends a long, gently modulated stereo tail with the dry grains. The shimmer control sends separate octave-up copies of grains into that tail. Module output volume follows the effect, and all modules still feed the shared master reverb.

The **bell~** module is a struck modal resonator. **STRIKE** plays the root note; **PLAY** runs the displayed note sequence. The initial pattern is major pentatonic, and a mood or image response can replace it. The exciter controls set mallet softness, strike position, and the amount, color, and duration of a noise burst. Resonator controls move the seven modes between harmonic and bell-like tuning, brighten or damp high partials, add detuned beating and a lower body resonance, and spread strikes across the stereo field. These controls affect newly struck notes; active rings finish naturally. Each bell module has its own cloud reverb and output level before the shared master bus.

```sh
npm run build
```

`dist/` is a static website. A sample URL from another host needs CORS permission from that host.

## Mood settings API

The **mood~** node sends a POST to `http://0.0.0.0:8000/api/chat` when **REQUEST & APPLY** is pressed. If that listening address cannot be reached from the browser, it retries `http://127.0.0.1:8000/api/chat`. The body contains only `prompt`, `system_prompt`, and `model` (`gpt-6-luna`). The prompt includes the entered mood, the built-in sample catalog, all current module settings and playing states, the master settings, and an example JSON response.

The **TRANSITION TIME** slider in the mood node sets how long a returned patch takes to arrive, from 0.2 to 30 seconds. The slider positions and values move through intermediate settings, and a progress bar shows the transition.

The API's `response` text must describe the master and every module present when the request starts. Each granular module needs a `sample` filename from the built-in catalog (or its current sample) and its `parameters`. If it chooses a different sample, `selectionStart: 0` and `selectionEnd: 0` mean use the whole newly loaded sample. Other returned source windows are fitted to its actual duration. Each bell module needs every exciter and resonator parameter plus a `sequence` of 4–16 integer semitone offsets from its `rootNote`, such as `[0,7,12,4,9,2,7,14]`. The displayed notes transpose when the root changes. Master reverb mix/decay, each module's reverb mix/decay, and granular shimmer must be included explicitly. Returned values are checked against the UI ranges and module IDs before they are applied. Numeric settings move over the selected transition time; filter mode and bell notes change midway. A new granular sample blends in over successive grains for the same duration, and reverb decay crossfades between impulse responses during the latter half. Playback states stay as they are. Open **CURRENT SETTINGS** or **LAST APPLIED RESPONSE** in the mood node to inspect the patch. The API server must be running on port 8000 with a configured model key; its built-in mock response is explanatory text and cannot be applied as settings.

Run `npm run test:patch` to check response validation without contacting the API.

Each granular module also has an **AI SAMPLE / ELEVENLABS** input. Enter a word and press **GENERATE** to POST `{ "prompt": "your word" }` to `http://localhost:8000/api/sfx`. The returned audio URL is decoded into that module's sample buffer; if it is playing, old and new samples blend across successive grains. The API server must have `ELEVENLABS_API_KEY` configured. Run `npm run test:sfx` to check the client contract without generating paid audio.

## Image scene to patch

Choose a PNG, JPEG, or WebP image in the **IMAGE / SCENE INPUT** area of `mood~`, optionally add direction in the mood text box, and press **IMAGE → PATCH + SFX**. The browser prepares at least three granular modules, adding modules when needed, then sends the image as a base64 data URL alongside a prompt containing the complete patch, built-in sample catalog, instrument capabilities, and JSON response example to `POST http://localhost:8000/api/image-patch`. The API uses `OPENAI_VISION_MODEL` (default `gpt-4o-mini`) to describe the visible scene and return a musical mood, a composition outline, master and module settings, and a role for each instrument. The generated mood replaces the text in **MOOD / INTENTION**. The prompt asks for one recognizable SFX tied to the image, while the other granular modules can turn existing samples into a pad, lead, or rhythmic/percussive layer. Existing bell modules can add sequenced accents. The model shapes grain timing, filters, levels, notes, and all effects to connect the layers.

After validating the response, the browser sends the single selected keyword to `/api/sfx`, loads that generated sound into its assigned granular module, switches the other granular modules to their chosen built-in samples, and applies all settings over the selected transition time. The image composition starts playing when it is ready. The scene description, composition outline, and resulting settings appear in `mood~`. If the request fails, automatically added modules are removed. This flow needs both `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` on the server. Images are limited to 8 MB. The offline checks are `npm run test:patch` and `server/venv/bin/python server/test_image_patch.py` from the project root under WSL.

## Structure

- `src/audio/AudioRack.ts` owns one AudioContext, the parallel input bus, and the shared master reverb/output.
- `src/audio/GranularEngine.ts` is one independent synth instance. Its output connects to the rack bus.
- `src/audio/BellEngine.ts` models an excited bell and schedules the note pattern.
- `src/audio/CloudReverb.ts` is the module's diffuse reverb and octave shimmer input.
- `src/ai/PatchPlan.ts` builds the mood request and validates the returned settings; `src/ai/MoodController.ts` owns the browser request and status display.
- `src/sampleCatalog.ts` lists the built-in sample filenames shown in the granular dropdown and sent in mood requests. Add new samples there after placing the files in `../Samples`.
- `src/ui/GranularPanel.ts` and `src/ui/BellPanel.ts` render the instrument controls. `src/main.ts` manages the patch workspace and module connections.

A different synth type can be added as another audio engine and matching panel. `AudioRack.addModule()` connects its engine to the same master bus as the granular modules.

This is an initial port of the granular voice, not a bit-for-bit reproduction of Max. The master reverb is a generated stereo room impulse with a 60% wet default, matching the mix saved in the Max ChamberVerb snapshot; it is not ChamberVerb's exact algorithm. The browser scheduler allows up to 64 concurrent grains per module and exposes density up to 60 grains per second as a practical starting range.

Grain playback rate is fixed at 1, and envelope slope is fixed at 0.5. These are internal constants in `GranularEngine.ts` and are not shown as controls.
