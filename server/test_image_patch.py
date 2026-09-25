"""Offline contract checks for the image-to-patch route."""

import asyncio
import base64
import os
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

import main


PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"test-image").decode()


async def check_route():
    assert any(getattr(route, "path", None) == "/api/image-patch" for route in main.app.routes)
    request = main.ImagePatchRequest(
        prompt="Make the rain and footsteps shape the music",
        system_prompt="Return synth settings and sfx_keyword",
        image_data_url=PNG,
    )

    calls = []

    async def fake_create(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='{"description":"rain"}'))],
            model="test-vision",
            usage=SimpleNamespace(prompt_tokens=12, completion_tokens=8, total_tokens=20),
        )

    client = SimpleNamespace(api_key="test-key", chat=SimpleNamespace(completions=SimpleNamespace(create=fake_create)))
    with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "OPENAI_VISION_MODEL": "test-vision"}):
        with patch.object(main, "openai_client", client):
            result = await main.generate_image_patch(request)
    assert result.success and result.response == '{"description":"rain"}'
    assert calls[0]["model"] == "test-vision"
    assert calls[0]["messages"][1]["content"][0]["text"] == request.prompt
    assert calls[0]["messages"][1]["content"][1]["image_url"]["url"] == PNG

    try:
        await main.generate_image_patch(main.ImagePatchRequest(
            prompt="test", system_prompt="test", image_data_url="data:text/plain;base64,dGVzdA=="
        ))
    except HTTPException as error:
        assert error.status_code == 422
    else:
        raise AssertionError("Unsupported image type was accepted")

    with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
        try:
            await main.generate_image_patch(request)
        except HTTPException as error:
            assert error.status_code == 503
        else:
            raise AssertionError("Missing API key was accepted")


if __name__ == "__main__":
    asyncio.run(check_route())
    print("Image patch route validation passed.")
