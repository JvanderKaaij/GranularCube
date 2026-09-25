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

```json
{
  "prompt": "Describe the visible scene and translate it into synth settings...",
  "system_prompt": "Return a scene description, mood, patch settings, and an sfx_keyword per granular module...",
  "image_data_url": "data:image/png;base64,..."
}
```

The route requires `OPENAI_API_KEY` and returns HTTP 503 when it is missing. Run `./venv/bin/python test_image_patch.py` for an offline route check; it replaces the OpenAI client with a fake and makes no paid request.
