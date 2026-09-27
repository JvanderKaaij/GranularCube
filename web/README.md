# GranularCube Web

A modular browser audio patch based on the Max project in the parent folder. Web Audio sources feed independent filter, stereo delay and reverb nodes through editable cables, then a master gain. The audio files in `../Samples` are copied into the web output.

## Run

```sh
cd web
npm install
npm run dev
```

Open the local address printed by the dev server. Each **granular~** module has independent sample, parameter, and playback controls. Use **+ ADD GRANULAR~** or **+ ADD PHYSICAL~** to run instruments in parallel, or **■ STOP ALL** to stop every module. Browsers require a click before audio output starts. Restart the dev server after adding or changing files in `../Samples`.

## Patching

- Drag a node header to move it. Focus a header and use arrow keys (Shift for larger steps) to move it with the keyboard.
- Click or drag **OUT** to an effect or master **IN**. Outputs can feed several nodes and inputs can sum several sources. Duplicate cables and feedback cycles are rejected; use delay feedback for repeats.
- Select a cable and press **Delete**, **Backspace**, or **DISCONNECT CABLE**. **Escape** cancels patching. Removing an effect removes its cables; bypassing it keeps the route intact.
- Use the effect toolbar to add filter~, delay~ or reverb~. New effects start disconnected. **CONTROLS** expands each node; **ARRANGE** lays nodes out along the signal paths. Scroll the canvas for larger patches.
- New granular sources start with **granular → filter → reverb → master**. New physical sources start with **physical → filter → delay → reverb → master**. These are editable initial routes. Effects can be shared between sources and survive source removal.
- **MOOD SETTINGS** opens/closes the composition and prompt editor. Layout and routing are currently held for the page session; reloading starts a fresh patch.

Granular source controls cover timing, sample window, amplitude and level. Grain length, source position and amplitude have two-handle range sliders. Source output is dry; the standalone filter colors the summed grains. The reverb node provides a diffuse, gently modulated stereo tail with wet/dry and decay controls.

The **physical~** module is a modal physical-modeling synth with Bell, Percussive body, and Plucked string models. **STRIKE** plays the root note; **PLAY** runs the displayed sequence. The model can change with each composition. Exciter and resonator controls shape the attack, pitch and tone; active voices finish naturally. Independent delay nodes alternate softened repeats left and right. Their echo level is added alongside the direct signal. New delay nodes use 0.62 echo level, 0.65 feedback and 0.75 s spacing. When composing a bell/string voice, the first connected active delay keeps at least 0.55 echo level, 0.58 feedback and 0.5–1.2 s spacing. Manual controls remain freely adjustable, and the model preserves bypass and routing. Sparse notes and shorter resonator decays let echoes carry the atmosphere.

```sh
npm run build
```

`dist/` is a static website. A sample URL from another host needs CORS permission from that host.

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

OPENAI MODELS in Mood Settings chooses the model separately for mood/parameter text and painting interpretation. Choices persist in browser storage. GPT-6 Astra, Sol and Luna use the OpenAI Responses API for JSON and image input; GPT-4.1, GPT-4.1 mini and GPT-4o mini use Chat Completions. Model access depends on the configured OpenAI API key and project.

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

This is an initial port of the granular voice, not a bit-for-bit reproduction of Max. The browser scheduler allows up to 64 concurrent grains per module and exposes density up to 60 grains per second as a practical starting range. Master has no hidden effects.

Grain playback rate is fixed at 1, and envelope slope is fixed at 0.5. These are internal constants in `GranularEngine.ts` and are not shown as controls.
