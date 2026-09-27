# AI Audio & Text Proxy API Server

A FastAPI backend designed to run on WSL / Linux / Windows, forwarding requests to **OpenAI** (Chat completions) and **ElevenLabs** (Sound Effects generation) and returning JSON, Base64 audio, and direct file downloads.

---

## 🚀 Running the Server in WSL

In your WSL terminal:

```bash
cd /mnt/d/UserProjects/Joey/Audio/MaxPatches/GranularCube/server
source ./venv/bin/activate
python main.py
```

- **Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

## 🔑 Environment Variables (`.env`)

```ini
# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Server
HOST=0.0.0.0
PORT=8000
```

---

## 🔊 ElevenLabs Sound Effects Endpoints

### 1. `POST /api/sfx` (JSON + Base64 + File URL)

#### Request Body:
```json
{
  "prompt": "futuristic granular laser blaster with metallic reverb",
  "duration_seconds": 3.0,
  "prompt_influence": 0.3,
  "loop": false
}
```

#### Response:
```json
{
  "success": true,
  "prompt": "futuristic granular laser blaster with metallic reverb",
  "duration_seconds": 3.0,
  "filename": "sfx_abc12345.mp3",
  "audio_url": "http://localhost:8000/static/sfx/sfx_abc12345.mp3",
  "audio_base64": "data:audio/mpeg;base64,...",
  "media_type": "audio/mpeg",
  "is_mock": false
}
```

### 2. `POST /api/sfx/raw` (Direct Binary Audio Stream)
Returns direct `audio/mpeg` MP3 stream.

---

## 💬 OpenAI Chat Endpoint

### `POST /api/chat`
```json
{
  "prompt": "Explain granular synthesis parameters.",
  "system_prompt": "You are an audio DSP assistant.",
  "model": "gpt-4o-mini"
}
```

## 🖼️ Image-to-Patch Endpoint

`POST /api/image-patch` accepts JSON with `prompt`, `system_prompt`, and `image_data_url`. The image must be a PNG, JPEG, or WebP base64 data URL, up to 8 MB decoded. The route sends the text and image together to a vision-capable OpenAI model (`OPENAI_VISION_MODEL`, default `gpt-4o-mini`) and returns the model's text in the same `response` field as `/api/chat`. The web app supplies the current module settings and required JSON patch format in the prompt, then validates the returned scene description, musical mood, settings, and SFX keywords locally.

Both endpoints accept an optional `model` override. The web Config window sends its selected text and painting models with each request. GPT-6 models use the Responses API; other selected models use Chat Completions. The dependency requirement includes the Responses API client. Model availability still depends on the OpenAI project and API key.

```json
{
  "prompt": "Describe the visible scene and translate it into synth settings...",
  "system_prompt": "Return a scene description, mood, patch settings, and an sfx_keyword per granular module...",
  "image_data_url": "data:image/png;base64,..."
}
```

The route requires `OPENAI_API_KEY` and returns HTTP 503 when it is missing. Run `./venv/bin/python test_image_patch.py` for an offline route check; it replaces the OpenAI client with a fake and makes no paid request.

## Server-stored setups

The web Config window uses these routes without making provider requests:

- `GET /api/setups`: setup summaries and the selected `defaultId`.
- `POST /api/setups`: save `{name, setup}` as a new experiment.
- `GET /api/setups/{id}`: read the full versioned setup.
- `PUT /api/setups/{id}`: update the named experiment with `{name, setup}`.
- `PUT /api/setups/default`: select `{setupId: id}` for startup, or `{setupId: null}` for the built-in patch.
- `GET /api/setup-audio/{filename}`: retrieve a saved PCM WAV sample asset.

Setups are written atomically to `data/setups/{id}.json`; `data/setups/default.json` holds the explicit startup selection. Generated and uploaded audio is decoded by the client and sent as PCM WAV, then stored by content hash in `data/setup_audio/`. Saved setup JSON references the asset filename rather than retaining base64 audio or browser blob URLs. Built-in references are checked against the actual `Samples` directory before saving. Graph topology, node IDs, layout and LFO metadata are validated before persistence; the client validates parameter ranges before saving and loading.

The data directory is ignored by Git and survives server restarts. Back up `data/setups/` and `data/setup_audio/` together, along with any referenced built-in samples. Saving does not automatically change the startup selection. Startup playback remains paused until the user starts a source.

Each entry in `layout` also saves an `ignoreLlm` boolean for instruments, effects and master. Missing flags in older setups default to `false`. The web client omits protected nodes from requested composition edits and locally skips their application, retaining their parameters, samples, notes and evolution. Current LFO settings and manual editing still apply.

`layout[nodeId].ignoredParameters` stores the individual parameter keys protected by the small lock buttons beside each LFO. Missing lists default to empty. Duplicate or unknown keys are rejected on save. The client includes current locked values in the prompt/schema and preserves them through validation and application. A sample-window lock also retains the source recording.

## Piano key samples

Place piano recordings in `../Samples/piano/`. `GET /api/piano-bank` reads the single SFZ there automatically, or an explicit `bank.json` selection/mapping, falling back to note-name/MIDI-number filenames when no SFZ exists (C4 = 60). The supplied `UprightPianoKW-small-bright-20190703.sfz` expands 26 recordings to all 88 playable keys. The response includes `{midi, filename, rootMidi, loopMode}` mappings, loop start/end seconds where applicable, SFZ filename and default release. Loop frame indices are converted using the original WAV sample rate, including the SFZ's inclusive end frame. Sample paths support subfolders and this bank's flattened layout. The revision includes the SFZ contents, mapping and recording metadata. Overlapping zones, unsupported opcodes and missing files return readable errors. No provider calls are needed. See `Samples/piano/README.md` for the supported SFZ subset.

`GET /api/piano-samples/{filename:path}` serves an existing audio file contained within that folder. The web sampler decodes only recordings needed by its gestures, deduplicating shared recordings, transposes from each root pitch, and honors continuous sustain loops. Refresh the bank after adding or replacing recordings or changing the SFZ; the revision invalidates the decoded sample cache. Saved setups preserve these mappings and validated gestures, and saving checks referenced files exist. Retain `Samples/piano/` when backing up these setups.
