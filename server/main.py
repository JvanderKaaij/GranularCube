import os
import uuid
import base64
import binascii
import re
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from openai import AsyncOpenAI, APIError as OpenAIAPIError, AuthenticationError as OpenAIAuthError, RateLimitError as OpenAIRateLimitError
from elevenlabs.client import AsyncElevenLabs

# Load environment variables from .env file
load_dotenv()

# Ensure static directories exist
STATIC_DIR = Path(__file__).resolve().parent / "static"
SFX_DIR = STATIC_DIR / "sfx"
SFX_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="AI Audio & Text Proxy API",
    description="FastAPI backend to handle web interface requests for OpenAI Chat and ElevenLabs Sound Effects",
    version="1.1.0",
)

# Enable CORS for web interfaces (browser frontend, Max/MSP, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder for serving generated audio files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Initialize Clients
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key and not openai_api_key.startswith("your_") else None

elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
elevenlabs_client = AsyncElevenLabs(api_key=elevenlabs_api_key) if elevenlabs_api_key and not elevenlabs_api_key.startswith("your_") else None

default_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# ==========================================
# Pydantic Schemas - OpenAI Chat
# ==========================================
class Message(BaseModel):
    role: str = Field(..., description="Role of message author: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")


class GenerateRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Simple prompt string")
    messages: Optional[List[Message]] = Field(None, description="Chat message history")
    system_prompt: Optional[str] = Field(None, description="Optional system instructions")
    model: Optional[str] = Field(None, description="OpenAI model (e.g. gpt-4o-mini, gpt-4o, gpt-3.5-turbo)")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Sampling temperature (omit or 1 for reasoning models)")
    max_tokens: Optional[int] = Field(None, ge=1, description="Maximum tokens to generate")
    mock: Optional[bool] = Field(False, description="Simulate response for testing without API key")


class UsageInfo(BaseModel):
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class GenerateResponse(BaseModel):
    success: bool
    response: str
    model: str
    usage: Optional[UsageInfo] = None
    is_mock: Optional[bool] = False


class ImagePatchRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Scene direction and current patch context")
    image_data_url: str = Field(..., max_length=11_300_000, description="Base64 data URL for a PNG, JPEG, or WebP image")
    system_prompt: str = Field(..., min_length=1, description="Synth patch JSON format and sound-design instructions")
    model: Optional[str] = Field(None, description="Vision-capable OpenAI model; defaults to OPENAI_VISION_MODEL")


# ==========================================
# Pydantic Schemas - ElevenLabs SFX
# ==========================================
class SoundFXRequest(BaseModel):
    prompt: str = Field(..., description="Description of the sound effect (e.g., 'granular sci-fi laser blast', 'wooden door creak')")
    duration_seconds: Optional[float] = Field(None, ge=0.5, le=22.0, description="Duration in seconds (0.5 to 22.0). If omitted, ElevenLabs decides optimal length.")
    prompt_influence: Optional[float] = Field(0.3, ge=0.0, le=1.0, description="Prompt influence (0.0 to 1.0). Higher values adhere more strictly to the prompt.")
    loop: Optional[bool] = Field(False, description="Generate seamlessly loopable sound effect")
    mock: Optional[bool] = Field(False, description="Simulate response for testing without API key")


class SoundFXResponse(BaseModel):
    success: bool
    prompt: str
    duration_seconds: Optional[float] = None
    filename: Optional[str] = None
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None
    media_type: str = "audio/mpeg"
    is_mock: Optional[bool] = False


# ==========================================
# Endpoints
# ==========================================
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "AI Audio & Text Proxy API is running.",
        "endpoints": {
            "POST /api/chat": "OpenAI Chat completion (text -> text)",
            "POST /api/image-patch": "OpenAI vision (image + prompt -> scene, synth settings, and SFX keywords)",
            "POST /api/sfx": "ElevenLabs Sound Effects (text -> audio MP3 + base64 + URL)",
            "POST /api/sfx/raw": "ElevenLabs Sound Effects (returns raw audio stream)",
            "GET /docs": "Interactive Swagger API documentation",
            "GET /health": "Service health and API key status"
        }
    }


@app.get("/health")
async def health_check():
    key_openai = os.getenv("OPENAI_API_KEY")
    key_eleven = os.getenv("ELEVENLABS_API_KEY")
    return {
        "status": "healthy",
        "openai_configured": bool(key_openai and not key_openai.startswith("your_")),
        "elevenlabs_configured": bool(key_eleven and not key_eleven.startswith("your_")),
        "default_model": default_model
    }


# ------------------------------------------
# OpenAI Chat Endpoint
# ------------------------------------------
@app.post("/api/chat", response_model=GenerateResponse)
async def generate_chat(request: GenerateRequest):
    messages_payload = []

    if request.system_prompt:
        messages_payload.append({"role": "system", "content": request.system_prompt})

    if request.messages:
        for msg in request.messages:
            messages_payload.append({"role": msg.role, "content": msg.content})
    elif request.prompt:
        messages_payload.append({"role": "user", "content": request.prompt})
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either 'prompt' or 'messages' must be provided in the request body."
        )

    selected_model = request.model or default_model
    current_key = os.getenv("OPENAI_API_KEY")
    is_key_missing = not current_key or current_key.startswith("your_")

    if request.mock or is_key_missing:
        user_input_preview = request.prompt or (request.messages[-1].content if request.messages else "")
        mock_reply = (
            f"[TEST MODE - Mock OpenAI Response]\n"
            f"Received prompt: \"{user_input_preview}\"\n"
            f"System instructions: \"{request.system_prompt or 'None'}\"\n\n"
            f"Your request was received by the backend successfully!"
        )
        return GenerateResponse(
            success=True,
            response=mock_reply,
            model=f"{selected_model}-mock",
            usage=UsageInfo(prompt_tokens=25, completion_tokens=40, total_tokens=65),
            is_mock=True
        )

    global openai_client
    if openai_client is None or openai_client.api_key != current_key:
        openai_client = AsyncOpenAI(api_key=current_key)

    try:
        is_reasoning_model = selected_model.startswith("o1") or selected_model.startswith("o3")
        
        completion_params = {
            "model": selected_model,
            "messages": messages_payload,
        }

        # Temperature is only supported on standard GPT models, not on o1/o3 reasoning models
        if request.temperature is not None and not is_reasoning_model:
            completion_params["temperature"] = request.temperature

        if request.max_tokens is not None:
            if is_reasoning_model:
                completion_params["max_completion_tokens"] = request.max_tokens
            else:
                completion_params["max_tokens"] = request.max_tokens

        completion = await openai_client.chat.completions.create(**completion_params)
        content = completion.choices[0].message.content or ""

        usage = None
        if completion.usage:
            usage = UsageInfo(
                prompt_tokens=completion.usage.prompt_tokens,
                completion_tokens=completion.usage.completion_tokens,
                total_tokens=completion.usage.total_tokens,
            )

        return GenerateResponse(
            success=True,
            response=content,
            model=completion.model,
            usage=usage,
            is_mock=False
        )

    except OpenAIAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"OpenAI Authentication Failed: {str(e)}")
    except OpenAIRateLimitError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"OpenAI Rate Limit Exceeded: {str(e)}")
    except OpenAIAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"OpenAI API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal Server Error: {str(e)}")


# ------------------------------------------
# OpenAI Image-to-Patch Endpoint
# ------------------------------------------
@app.post("/api/image-patch", response_model=GenerateResponse)
async def generate_image_patch(request: ImagePatchRequest):
    match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})", request.image_data_url)
    if not match:
        raise HTTPException(status_code=422, detail="image_data_url must be a base64 PNG, JPEG, or WebP data URL.")
    try:
        image_bytes = base64.b64decode(match.group(2), validate=True)
    except binascii.Error:
        raise HTTPException(status_code=422, detail="image_data_url contains invalid base64 data.")
    if not image_bytes or len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image must be between 1 byte and 8 MB.")

    current_key = os.getenv("OPENAI_API_KEY")
    if not current_key or current_key.startswith("your_"):
        raise HTTPException(status_code=503, detail="Configure OPENAI_API_KEY to analyze images.")

    global openai_client
    if openai_client is None or openai_client.api_key != current_key:
        openai_client = AsyncOpenAI(api_key=current_key)
    selected_model = request.model or os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini")
    try:
        completion = await openai_client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": request.prompt},
                    {"type": "image_url", "image_url": {"url": request.image_data_url, "detail": "high"}},
                ]},
            ],
        )
        content = completion.choices[0].message.content or ""
        usage = None
        if completion.usage:
            usage = UsageInfo(
                prompt_tokens=completion.usage.prompt_tokens,
                completion_tokens=completion.usage.completion_tokens,
                total_tokens=completion.usage.total_tokens,
            )
        return GenerateResponse(success=True, response=content, model=completion.model, usage=usage)
    except OpenAIAuthError as e:
        raise HTTPException(status_code=401, detail=f"OpenAI Authentication Failed: {str(e)}")
    except OpenAIRateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI Rate Limit Exceeded: {str(e)}")
    except OpenAIAPIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# ------------------------------------------
# ElevenLabs Sound Effects Endpoints
# ------------------------------------------
async def _generate_sfx_bytes(request: SoundFXRequest) -> tuple[bytes, bool]:
    """Helper to generate SFX audio bytes either from ElevenLabs or mock generator."""
    current_key = os.getenv("ELEVENLABS_API_KEY")
    is_key_missing = not current_key or current_key.startswith("your_")

    if request.mock or is_key_missing:
        # Minimal valid silent/beep MP3 audio frame for mock testing
        # 1-second silence/mock frame in standard MP3
        mock_mp3_header = bytes([
            0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ] * 32)
        return mock_mp3_header, True

    global elevenlabs_client
    if elevenlabs_client is None or getattr(elevenlabs_client, "_api_key", None) != current_key:
        elevenlabs_client = AsyncElevenLabs(api_key=current_key)

    try:
        kwargs = {"text": request.prompt}
        if request.duration_seconds is not None:
            kwargs["duration_seconds"] = request.duration_seconds
        if request.prompt_influence is not None:
            kwargs["prompt_influence"] = request.prompt_influence
        if request.loop:
            kwargs["loop"] = request.loop

        audio_generator = elevenlabs_client.text_to_sound_effects.convert(**kwargs)

        audio_chunks = []
        async for chunk in audio_generator:
            audio_chunks.append(chunk)

        audio_bytes = b"".join(audio_chunks)
        if not audio_bytes:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No audio data returned from ElevenLabs.")

        return audio_bytes, False

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "Unauthorized" in error_msg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"ElevenLabs Authentication Failed: {error_msg}")
        elif "429" in error_msg or "rate_limit" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"ElevenLabs Rate Limit Exceeded: {error_msg}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"ElevenLabs API Error: {error_msg}")


@app.post("/api/sfx", response_model=SoundFXResponse)
async def generate_sound_effect(request: SoundFXRequest, req: Request):
    """
    Generate a sound effect from text and return JSON with:
    - audio_base64: Base64 data URI for instant web / audio engine playback
    - audio_url: HTTP download URL for the saved MP3 file
    - filename: Saved filename
    """
    audio_bytes, is_mock = await _generate_sfx_bytes(request)

    # Save audio file to static/sfx
    file_id = f"sfx_{uuid.uuid4().hex[:12]}"
    filename = f"{file_id}.mp3"
    file_path = SFX_DIR / filename

    with open(file_path, "wb") as f:
        f.write(audio_bytes)

    # Build audio URL based on incoming request host
    base_url = str(req.base_url).rstrip("/")
    audio_url = f"{base_url}/static/sfx/{filename}"
    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

    return SoundFXResponse(
        success=True,
        prompt=request.prompt,
        duration_seconds=request.duration_seconds,
        filename=filename,
        audio_url=audio_url,
        audio_base64=f"data:audio/mpeg;base64,{audio_base64}",
        media_type="audio/mpeg",
        is_mock=is_mock
    )


@app.post("/api/sfx/raw")
async def generate_sound_effect_raw(request: SoundFXRequest):
    """Generate sound effect and directly stream/return the raw MP3 audio bytes."""
    audio_bytes, _ = await _generate_sfx_bytes(request)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "attachment; filename=sound_effect.mp3"}
    )


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    print(f"Starting server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
