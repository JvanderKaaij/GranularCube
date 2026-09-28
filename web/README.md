# GranularCube Web

A modular browser audio patch based on the Max project in the parent folder. Web Audio sources feed independent filter, stereo delay and reverb nodes through editable cables, then a master gain. The audio files in `../Samples` are copied into the web output.

## Run

```sh
cd web
npm install
npm run dev
```

Open the local address printed by the dev server. Each **granular~** module has independent sample, parameter, and playback controls. The left module library groups **INSTRUMENTS** in blue and **EFFECTS** in amber, separated by a divider. Click **granular~**, **physical~**, or **piano_sampler~** to add an instrument, or **■ STOP ALL** to stop every module. Browsers require a click before audio output starts. Restart the dev server after adding or changing built-in granular files in `../Samples`; piano keys are served directly by the Python server.

## Phone player

The separate museum client has a camera/photo picker, play/pause, calculation stages with elapsed time, cancellation and a small Settings panel for saved setups and models. It creates the actual audio graph without rendering any editor nodes or debug controls. The desktop editor remains at its usual address.

Keep the Python API running, then start the phone client in a second terminal:

```sh
cd web
npm run mobile
```

Open the printed **Phone on the same Wi-Fi** address on your phone (normally `http://YOUR-COMPUTER-IP:5174/`). The computer and phone must be on the same network, with incoming connections to port 5174 allowed. This command serves the client and proxies its API/audio requests to `http://127.0.0.1:8000`, so it also works with a backend exposed from WSL only on the computer's localhost. Set `GRANULARCUBE_API_ORIGIN` if that backend is elsewhere; `MOBILE_PORT` changes the listening port. API keys stay on the Python server.

The server's chosen startup setup loads automatically with playback paused. Use **Settings → Sound setup → Load setup** to choose another. The URL records `?setup=ID`, so bookmarking/sharing it opens that particular saved setup. If no default is selected, the player asks you to choose one. It restores instruments, effect routing and bypass, authored settings, samples, piano mapping/gestures, modulation, prompt overrides, transition time and all LLM locks. Play uses the saved active voices; when all voices were saved stopped, Play auditions all playable instruments. Image compositions activate editable voices as in the editor.

**Photograph artwork** opens the phone's rear-camera capture flow; **Choose from photos** opens its library. Selecting a photo immediately starts composition. Browser-decodable photos are resized to at most 1600 pixels and converted to JPEG before upload. Existing music continues during interpretation, parameter/SFX generation and decoding, then transitions when every recording is ready. Missing recordings prevent application. Settings offers separate painting and composition models, initially taken from the saved setup; phone overrides apply to this session's next request. Choose **Compose again** to retry the current photo with different models.

The phone browser needs a tap to start audio and can interrupt playback during camera use or while backgrounded. Return to the player and tap Play if needed. The player requests a screen wake lock while listening when supported. **Spectral AudioWorklet processing and screen wake locks require HTTPS on phones.** For the development gateway, set both `MOBILE_TLS_CERT` and `MOBILE_TLS_KEY` to a certificate/key trusted by the phone for your computer's address; the same command then serves HTTPS. An HTTPS reverse proxy to the Python server is another option. Other instruments and effects can use local HTTP.

`npm run build` builds both clients. The Python API can serve the built player directly at `/mobile/` (for example `http://YOUR-COMPUTER-IP:8000/mobile/`) when its port is reachable from the phone. The setup selector and URLs work identically there. The mobile entry is `src/mobile.ts`; `audio/HeadlessPatch.ts` runs the saved graph and transitions; `ai/ComposePainting.ts` uses the editor's shared prompt, schema, validation and sample-selection functions.

## Patching

- Drag a node header to move it. Focus a header and use arrow keys (Shift for larger steps) to move it with the keyboard.
- Click or drag **OUT** to an effect or master **IN**. Outputs can feed several nodes and inputs can sum several sources. Duplicate cables and feedback cycles are rejected; use delay feedback for repeats.
- Select a cable and press **Delete**, **Backspace**, or **DISCONNECT CABLE**. **Escape** cancels patching. Removing an effect removes its cables; bypassing it keeps the route intact.
- Use **EFFECTS** in the left library to add filter~, delay~, reverb~ or spectral~. New effects start disconnected. **CONTROLS** expands each node; **ARRANGE** lays nodes out along the signal paths. Scroll the canvas for larger patches. The library scrolls independently on shorter screens.
- New granular sources start with **granular → filter → reverb → master**. New physical and piano sources start with **source → filter → delay → reverb → master**. These are editable initial routes. Effects can be shared between sources and survive source removal.
- **MOOD SETTINGS** opens/closes the composition and prompt editor. **CONFIG** opens setup storage and model choices. Close either window with its × button or Escape.
- Every instrument, effect and master node has an **IGNORE LLM** checkbox, visible even when its controls are collapsed. Checked nodes retain their current base parameters, samples, physical modes/sequences, piano gestures and evolution through painting and mood compositions. Existing LFOs keep running, and manual edits remain available. The model sees protected nodes as musical/routing context but only composes editable nodes; protected granular voices do not request or receive new SFX. A shared effect remains independently editable unless its own checkbox is checked. Changing the checkbox cancels an in-progress composition or transition.

Granular source controls cover timing, sample window, amplitude and level. Grain length, source position and amplitude have two-handle range sliders. Source output is dry; the standalone filter colors the summed grains. The reverb node provides a diffuse, gently modulated stereo tail with wet/dry and decay controls.

Filter cutoff sliders use logarithmic spacing: 20, 200, 2000 and 20000 Hz are evenly spaced across the filter slider, giving low frequencies much more room. LFOs move the thumb on that same scale. Audio parameters, displayed frequencies and saved setups continue to use Hz.

The **physical~** module is a modal physical-modeling synth with Bell, Percussive body, and Plucked string models. **STRIKE** plays the root note; **PLAY** runs the displayed sequence. The model can change with each composition. Exciter and resonator controls shape the attack, pitch and tone; active voices finish naturally. Independent delay nodes alternate softened repeats left and right. Their echo level is added alongside the direct signal. New delay nodes use 0.62 echo level, 0.65 feedback and 0.75 s spacing. When composing a bell/string voice, the first connected active delay keeps at least 0.55 echo level, 0.58 feedback and 0.5–1.2 s spacing. Manual controls remain freely adjustable, and the model preserves bypass and routing. Sparse notes and shorter resonator decays let echoes carry the atmosphere.

```sh
npm run build
```

`dist/` is a static website. A sample URL from another host needs CORS permission from that host.

## Piano sampler

**piano_sampler~** is a dry sample instrument with mapped keys and occasional chord gestures. The supplied `../Samples/piano/UprightPianoKW-small-bright-20190703.sfz` maps 26 recordings across all 88 keys, A0–C8 (MIDI 21–108). The server selects the single SFZ automatically, reads key zones and root pitches, and confirms the referenced files exist. The UI shows playable keys and recording count separately. The flattened WAV layout is supported without changing the SFZ. Add the instrument and use **REFRESH BANK** after updating recordings or the SFZ.

Without an SFZ, filenames can be note names such as `A3.wav`, `C#4.wav`, `Db4.wav` (C4 = MIDI 60), or MIDI numbers such as `57.wav`. Optional prefixes separated by an underscore, space or hyphen are supported. An explicit `Samples/piano/bank.json` can list `{midi, filename, rootMidi}` mappings or select an SFZ by filename; that folder's README describes the supported subset. Duplicate key assignments and overlapping SFZ zones are rejected. Velocity controls level; multiple recording layers are not yet supported.

**PLAY** starts irregular chord appearances, initially 6–30 seconds apart. Both pause controls and their LFOs stay within 6–30 seconds; the LLM receives these same ranges. Older saved setups with longer valid pauses are capped to 30 seconds on load. **PREVIEW** plays the first gesture once. Controls set minimum/maximum pauses between chord starts, hold, release, stereo spread and gain; every control has its own LFO and module gain always moves slowly. Each note selects its mapped recording and plays at `2 ** ((midi - rootMidi) / 12)`. Lower SFZ regions loop through hold and release using the original WAV loop times; higher regions decay naturally, with duration adjusted for pitch. The first bank load uses the SFZ release default (0.6 s for this upright), after which manual/LLM controls can change it. Missing samples and invalid loops prevent application of a new plan before the current soundscape is changed. Only recordings needed by the requested gestures are decoded, once per filename even when several notes share one recording. Playback caps concurrent notes and skips missed appearances after background tab stalls.

The LLM gets every playable MIDI key, whether it can sustain, and bank metadata, then composes 1–8 complementary gestures with 2–8 distinct notes each. It requests sounding pitches; transposition is automatic, so harmony is not restricted to recorded roots. Every note has `midi`, `offsetMs` from the chord onset, and `velocity` (0.05–1); the first onset is zero and the whole attack span is at most 2000 ms. The prompt connects voicing, register, contour, onset span and pauses to the painting/mood, without a populated chord example. Gesture choices change at the transition midpoint after all required keys have decoded. Currently ringing notes finish. A painting starts a stopped piano after the transition; text compositions preserve transport state. A bank with fewer than two keys remains silent while the rest of the patch can compose normally.

Expand **CONTROLS → EDIT GESTURE JSON** to inspect or manually apply the same data format. For the requested A3–C4–E4–A4 ascent over 180 ms, one gesture is:

```json
{
  "label": "Open minor ascent",
  "notes": [
    { "midi": 57, "offsetMs": 0,   "velocity": 0.50 },
    { "midi": 60, "offsetMs": 60,  "velocity": 0.46 },
    { "midi": 64, "offsetMs": 120, "velocity": 0.48 },
    { "midi": 69, "offsetMs": 180, "velocity": 0.42 }
  ]
}
```

The editor holds an array of these gesture objects. This documentation example is not inserted into LLM prompts. Saved setups preserve root pitches, loop times, bank metadata, gestures, controls, LFOs and routing; recordings remain in `Samples/piano/`. Exact passages from older saved prompts that prohibited piano transposition/loops are migrated when loaded.

## Saved setups

Open **CONFIG**, enter a setup name, and use **SAVE NEW** to store an experiment on the running Python server. Select a saved setup to **LOAD SELECTED** or **UPDATE SELECTED** with the current patch. Saving a new setup preserves your other experiments; updating replaces the selected setup. Setup names do not need to be unique.

**IGNORE LLM** choices are stored with each node in the server setup and restored on load/startup. Use **SAVE NEW** or **UPDATE SELECTED** after changing them. Older setups default to allowing LLM changes.

Each parameter also has a small lock button next to its **∿** LFO button. Amber means **ignore LLM**: its authored base value stays fixed through mood/painting composition, validation, level balancing and transitions. Manual adjustments and its existing LFO still work. Modes, spectral freeze, the granular sample, physical note sequence and piano chord gestures have the same lock control. The whole-node checkbox takes precedence. Locks are saved/restored with the server setup; older setups start unlocked. Changing a lock cancels a pending request or transition. A locked source-window endpoint retains its current recording so that the fixed window remains valid; an unlocked partner in a min/max pair adjusts to preserve the ordering.

A setup includes every source and effect, authored parameter values, physical modes and note sequences, effect bypass, audio cables, node positions and expanded/collapsed states, per-parameter LFO settings and phases, slow-evolution settings, master level, mood intention, transition time, editable prompts, and both model choices. Generated, uploaded, and URL-loaded samples are stored as PCM WAV assets on the server; built-in samples reference the files in `../Samples`. Loading prepares and decodes all referenced audio before replacing the current patch. A missing sample or an edit made during preparation leaves the current patch in place.

**USE SELECTED AT STARTUP** makes a saved experiment the initial patch for future page loads. It does not change the current patch. No saved setup becomes the startup setup automatically. **USE BUILT-IN STARTUP** clears that preference. Startup loads with audio paused; **LOAD SELECTED** restores the saved source playback states. The server library lives in `server/data/setups/`, with audio in `server/data/setup_audio/`. These local data folders are ignored by Git. Back up both folders together; retain built-in sample files as well.

Model selectors are in **CONFIG**, separately for mood/parameter composition and painting interpretation. Changes apply to the next composition and are persisted when you save or update a setup. A setup marked for startup restores these choices when the page opens.

## Composition pipeline

Both mood requests and paintings use two stages. The first produces a validated musical brief: atmosphere, six normalized axes (tension, warmth, movement, density, space, brightness), instrument roles, relative level weights, target grain overlap, ranked sample candidates, physical models, and restrained evolution. Every painting with a granular instrument requires one new artwork sound. The top-level imageSound describes a real physical source, audible action, acoustic details, visual evidence, and whether the source is depicted, implied, or a material analogy for abstract art. The client assigns that sound to one granular voice independently of module source fields, so omitted or built_in source flags cannot silently skip generation. ElevenLabs receives a concise literal sentence and an eight-second duration; the app derives its short display label from the source and action. Mood and era stay in the musical brief. A still scene uses a plausible interaction with depicted material or environment; abstract art uses an honestly labelled concrete sound interpretation. The painting is interpreted independently of the previous mood text. The mood field updates as soon as this brief is ready.

The second request composes parameters from that brief. Its JSON context includes numeric control bounds, steps, units, musical descriptions, sample durations, source presets, actual effect nodes, bypass states and cables. It identifies the sources feeding each effect and whether the effect reaches master. Source parameters, effect parameters and master gain are separate. Every effect receives settings and an intent; bypassed and disconnected effects retain their values. Shared effects must suit all incoming voices. Physical settings are deliberate preset overrides with a fresh sequence. Grain density comes from target overlap divided by mean grain duration; module gain is composed at an audible role-based level and combined source energy retains RMS headroom. Artwork sounds use long grains, 1.2–2.5 overlap, an audible level and the full decoded window. Source and effect settings transition together after all samples are prepared; reverb decay crossfades at the midpoint. Routing edits cancel pending composition, while moving nodes does not.

Both requests describe their required output using an outputSchema containing field types, bounds and allowed values. There are no populated response examples, suggested source descriptions, suggested axis values, preselected roles or example melodies. Brief instructions contain no named physical source examples. The artwork source is chosen from visible evidence before the arrangement; catalog filenames and formatting metadata are explicitly excluded as visual evidence. Actual catalog data, instrument presets and authored atmospheric constraints remain available for their musical purpose.

Each physical voice receives a newly composed motif. The model sees its current root and sequence, the note limits, and an instruction to change the contour or pitch selection for the new brief. If a valid response repeats the active sequence exactly, the client varies an internal note using nearby legal pitches and the brief's atmosphere; the debug corrections show both versions. Notes and root switch together at the midpoint of the transition.

Sample selection uses the model's ranked alternatives, current sources, and the last four successful compositions. Granular dropdowns wait for `/api/samples` and show only catalog entries that exist in the server's `Samples` folder; the composition prompt and sample preparation use that verified list too. Invalid model names are discarded and short rankings are completed with available files carrying suitable role tags. Repetition is allowed when all ranked choices were recent, or when the brief explains why reuse matters. Catalog tags are editorial hints inferred from source names, not measured acoustic features or verified pitch. Only catalog entries carrying note metadata have supplied pitch information.

Parameter generation and ElevenLabs generation run concurrently after the brief is validated. All selected samples are fetched and decoded in parallel without modifying the playing patch. Once every buffer is ready and the patch is still unchanged, the buffers are committed together and the parameter transition starts. Generated samples use the newly decoded duration. If preparation fails or a request is canceled, none of its buffers are installed. Manual parameter edits, choosing another painting, and STOP ALL cancel a pending composition. Cancellation during an already-started transition leaves the intermediate settings; it does not rewind the soundscape.

Each numeric control has its own small ∿ button for its LFO. Open it to set that parameter's period, depth, waveform, or enable state. LFO settings and phases are independent; the slider and readout show the live value while the authored base remains unchanged. Module output gain always has a slow LFO with a clearly audible but partial depth; its period and depth remain adjustable. Grain density, physical rate/brightness/spread, and filter cutoff also have stronger gentle movement enabled by default. All other numeric controls can be enabled individually. LFO motion is separate from SLOW EVOLUTION, which adds composition-specific motion around authored settings.

The SPECTRAL~ insert is a first phase-vocoder pass with a 1024-sample analysis window. It offers wet/dry, semitone spectral shift, temporal spectral smear, and a freeze toggle. Freeze captures the current spectral frame and continues its phase evolution; the node adds a short processing latency. The browser loads its AudioWorklet processor from `phase-vocoder-processor.js`, copied into the web build output.

SLOW EVOLUTION applies gentle motion around the authored settings: granular density, source region and stereo position; physical rate, brightness and width. It ramps in over ten seconds, follows the brief's amount and 20–180 second periods, and never accumulates drift. Current settings show the authored base values. The checkbox disables or enables evolution, and a manual parameter edit clears motion for that instrument until the next applied composition.

PIPELINE DEBUG shows the brief, roles, source choices and reasons, parameter explanations, changes from the previous patch, corrections, and stage durations. Its SFX status distinguishes requested, generated, installed, failed and canceled work. REQUESTS & MODEL OUTPUTS exposes the exact text prompts and responses, including the actual SFX payload, without image bytes. Invalid model JSON gets up to two corrective requests; sound generation is not retried. Provider failures stop application and show an error. A five-minute timeout and CANCEL REQUEST stop client work. Provider work already in progress may still complete remotely.

PROMPTS · EDIT & EXPERIMENT exposes editable system instructions for the painting/mood brief and synth parameter/note composition, plus the ElevenLabs description template. The template expands {source}, {action}, and {character} from the artwork brief. Edits are saved automatically in this browser and applied to the next composition; each field and all prompts have reset buttons. Each run captures the prompt settings at its start, so edits during generation apply to the following run. Exact older built-in example passages still present in saved system instructions are migrated to neutral guidance, with a notice in the editor. JSON validation and local atmospheric limits remain enforced.

PROMPTS · LAST COMPOSITION REQUESTS shows the actual system and request text in readable form, with copy buttons, including generated patch context, every correction request, and the expanded ElevenLabs payload. It is separate from the editors, so a recorded request stays accurate when you edit the next experiment. Only overrides are stored locally; unedited fields follow the latest application defaults.

The existing server routes are reused: image interpretation uses /api/image-patch and OPENAI_VISION_MODEL, text composition uses /api/chat and OPENAI_MODEL, and generated audio uses /api/sfx with ELEVENLABS_API_KEY. The client now follows the server's configured text model instead of hardcoding a model name. Image files remain limited to 8 MB. A physical-only patch can interpret an image without an SFX request.

OPENAI MODELS in Config chooses the model separately for mood/parameter text and painting interpretation. Choices persist in server-saved setups. GPT-6 Astra, Sol and Luna use the OpenAI Responses API for JSON and image input; GPT-4.1, GPT-4.1 mini and GPT-4o mini use Chat Completions. Model access depends on the configured OpenAI API key and project.

Run npm run test:patch for composition, ranked sample choices, presets, overlap/level limits, a two-hour bounded modulation simulation, preparation failures, stale patches, and transition interpolation. Run npm run test:sfx for the SFX contract. These checks make no paid API calls. Use a recent Node version (18 or later for the Response API in the SFX check) and install dependencies on the platform where they will run.

## Structure

- `src/audio/AudioRack.ts` owns one AudioContext and registers source/effect ports with a master gain/output.
- `src/audio/AudioGraph.ts` owns real audio cables, branch isolation, connection fades and cycle prevention.
- `src/audio/EffectNode.ts` owns independent filter, delay and reverb inserts, bypass, defaults and musical control metadata.
- `src/ui/PatchEditor.ts` owns node placement and cable editing; `src/ui/EffectPanel.ts` renders effect controls.
- `src/ai/EffectPlan.ts` validates effect plans, describes routing and keeps connected melodic echoes prominent.
- `src/audio/GranularEngine.ts` is one independent dry source with sample playback and grain envelopes.
- `src/audio/PhysicalEngine.ts` provides bell, percussion and string modal voices and schedules their notes.
- `src/audio/AtmosphericDelay.ts` provides the separate alternating stereo echo return; `src/audio/PhysicalAtmosphere.ts` shares the melodic delay limits with the parameter composer.
- `src/audio/CloudReverb.ts` provides the diffuse reverb processor used by reverb nodes.
- `src/ai/Composition.ts` builds and validates musical briefs and parameter plans; `src/ai/MoodController.ts` coordinates requests and diagnostics.
- `src/ai/PatchPlan.ts` shares control metadata and validates final patches; `src/ai/PatchPreparation.ts` guards sample preparation and commit.
- `src/audio/AmbientMotion.ts` supplies bounded evolution; `src/ai/PhysicalPresets.ts` defines the physical starting voices.
- `src/sampleCatalog.ts` lists the built-in sample filenames shown in the granular dropdown and sent in mood requests. Add new samples there after placing the files in `../Samples`.
- `src/ui/GranularPanel.ts` and `src/ui/PhysicalPanel.ts` render the instrument controls. `src/main.ts` manages the patch workspace and module connections.

A different synth type can be added as another audio engine and matching panel. `AudioRack.addModule()` registers its output under a node ID; the graph determines its route to master. Legacy source effect fields remain in internal parameter types for older patch compatibility, but they do not process audio or appear as source controls in new composition schemas.

This is an initial port of the granular voice, not a bit-for-bit reproduction of Max. The browser scheduler allows up to 64 concurrent grains per module and exposes density up to 60 grains per second as a practical starting range. The desktop master has no hidden effects.

### Mobile audio and screen locking

The phone player requests playback latency, uses a shared worker scheduling clock with additional lookahead, and skips overdue grains/strikes after a stall instead of playing them all at once. It uses a lightweight stereo feedback reverb rather than long convolution impulses; saved mix/decay values and routing still apply, but the reverb character differs from the desktop. A master compressor controls overlapping peaks without changing saved module levels.

Mobile granular voices mix grains in a dedicated worker into half-second stereo buffers. This replaces per-grain source/envelope/panner node creation with two playback sources per second, while preserving grain windows, envelopes, density, panning and movement. The queue covers roughly two seconds while visible and four while hidden, so granular parameter/sample changes can take that long to become audible (plus up to one half-second chunk). The 64-grain limit counts actual overlap rather than all future queued grains. Workers are usable over LAN HTTP; native per-grain playback remains the fallback if worker startup fails. This is still live generative audio, not a repeating recorded soundscape. The shared scheduler ticks less frequently when hidden, and effect/master modulation uses that clock as well.

The player requests the browser's playback audio-session type where supported and registers Media Session play/pause controls. Hiding the page no longer explicitly pauses the engine. Screen locking can still suspend the browser or its JavaScript scheduler, so these changes do not guarantee continuous screen-off synthesis on every phone. HTTPS enables the screen wake lock while the player is visible (and is required for spectral AudioWorklets); it does not override OS background restrictions. Resume returns to the current patch without a burst of missed notes. Device/browser testing is still needed before relying on a two-hour locked-screen session.

Grain playback rate is fixed at 1, and envelope slope is fixed at 0.5. These are internal constants in `GranularEngine.ts` and are not shown as controls.
