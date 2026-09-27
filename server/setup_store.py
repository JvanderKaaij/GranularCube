"""Versioned patch setups and their audio assets, stored on the API server."""
import base64
import binascii
import hashlib
import io
import json
import os
import re
import threading
import uuid
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from piano_bank import piano_sample_path


class StoredModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SampleReference(StoredModel):
    kind: Literal["builtin", "asset"]
    name: str = Field(min_length=1, max_length=300)
    filename: str | None = None
    audioBase64: str | None = Field(default=None, max_length=48_000_000)


class MovementSettings(StoredModel):
    amount: float = Field(ge=0, le=1)
    periodSeconds: float = Field(ge=20, le=180)


class PianoSample(StoredModel):
    midi: int = Field(ge=21, le=108)
    filename: str
    rootMidi: int | None = Field(default=None, ge=0, le=127)
    loopMode: Literal["no_loop", "loop_continuous"] | None = None
    loopStartSeconds: float | None = Field(default=None, ge=0)
    loopEndSeconds: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def check_loop(self):
        if self.loopMode == "loop_continuous" and (self.loopStartSeconds is None or self.loopEndSeconds is None or self.loopEndSeconds <= self.loopStartSeconds):
            raise ValueError("Piano continuous loops need ordered start/end seconds")
        return self


class PianoBank(StoredModel):
    name: str
    revision: str
    samples: list[PianoSample] = Field(max_length=88)
    warnings: list[str] | None = None
    sfz: str | None = None
    defaultReleaseSeconds: float | None = Field(default=None, ge=0, le=10)


class PianoNote(StoredModel):
    midi: int = Field(ge=21, le=108)
    offsetMs: float = Field(ge=0, le=2000)
    velocity: float = Field(ge=0.05, le=1)


class PianoGesture(StoredModel):
    label: str = Field(min_length=1, max_length=120)
    notes: list[PianoNote] = Field(min_length=2, max_length=8)


class SetupModule(StoredModel):
    id: int = Field(ge=1, le=1_000_000)
    type: Literal["granular", "physical", "piano_sampler"]
    playing: bool = False
    movement: MovementSettings | None = None
    parameters: dict[str, float | str | bool]
    sample: SampleReference | None = None
    sequence: list[int] | None = Field(default=None, min_length=1, max_length=64)
    bank: PianoBank | None = None
    gestures: list[PianoGesture] | None = Field(default=None, max_length=8)

    @model_validator(mode="after")
    def check_source(self):
        if self.type == "granular" and self.sample is None:
            raise ValueError("Granular modules need a sample reference")
        if self.type == "physical" and self.sequence is None:
            raise ValueError("Physical modules need a note sequence")
        if self.type == "piano_sampler":
            if self.bank is None or self.gestures is None:
                raise ValueError("Piano modules need a sample bank and gestures")
            keys = {sample.midi for sample in self.bank.samples}
            if len(keys) != len(self.bank.samples) or bool(self.gestures) != (len(keys) >= 2):
                raise ValueError("Piano needs unique keys and gestures when at least two keys are available")
            for gesture in self.gestures:
                notes = {note.midi for note in gesture.notes}
                if not notes <= keys or len(notes) != len(gesture.notes) or min(note.offsetMs for note in gesture.notes) != 0:
                    raise ValueError("Piano gestures need unique available notes and an onset at zero")
        return self


class SetupEffect(StoredModel):
    id: str = Field(pattern=r"^fx[1-9][0-9]{0,5}$")
    type: Literal["filter", "delay", "reverb", "spectral"]
    parameters: dict[str, float | str | bool]
    bypass: bool


class SetupConnection(StoredModel):
    from_: str = Field(alias="from")
    to: str


class NodeLayout(StoredModel):
    x: float = Field(ge=0, le=100_000)
    y: float = Field(ge=0, le=100_000)
    collapsed: bool
    ignoreLlm: bool = False
    ignoredParameters: list[str] = Field(default_factory=list, max_length=96)


class LfoSettings(StoredModel):
    enabled: bool
    periodSeconds: float = Field(ge=20, le=240)
    depth: float = Field(ge=0, le=1)
    waveform: Literal["sine", "triangle"]
    phaseRadians: float


class ModelSelection(StoredModel):
    text: str = Field(min_length=1, max_length=100)
    image: str = Field(min_length=1, max_length=100)


class PromptSettings(StoredModel):
    briefSystem: str = Field(min_length=1, max_length=100_000)
    parameterSystem: str = Field(min_length=1, max_length=100_000)
    sfxTemplate: str = Field(min_length=1, max_length=10_000)


class MoodSettings(StoredModel):
    intention: str = Field(max_length=20_000)
    transitionSeconds: float = Field(ge=0.2, le=30)
    evolutionEnabled: bool
    prompts: PromptSettings


class PatchSetup(StoredModel):
    version: Literal[1]
    models: ModelSelection
    mood: MoodSettings
    master: dict[str, float]
    modules: list[SetupModule] = Field(max_length=64)
    effects: list[SetupEffect] = Field(max_length=128)
    connections: list[SetupConnection] = Field(max_length=512)
    layout: dict[str, NodeLayout]
    lfos: dict[str, dict[str, LfoSettings]]

    @model_validator(mode="after")
    def check_graph(self):
        source_ids = {f"source:{m.id}" for m in self.modules}
        effect_ids = {e.id for e in self.effects}
        if len(source_ids) != len(self.modules) or len(effect_ids) != len(self.effects):
            raise ValueError("Module and effect IDs must be unique")
        node_ids = source_ids | effect_ids | {"master"}
        if set(self.layout) != node_ids or set(self.lfos) != node_ids:
            raise ValueError("Each node needs its layout and LFO settings")
        parameter_keys = {"master": set(self.master)}
        for module in self.modules:
            extra = {"granular": "sample", "physical": "sequence", "piano_sampler": "gestures"}[module.type]
            parameter_keys[f"source:{module.id}"] = set(module.parameters) | {extra}
        parameter_keys.update({effect.id: set(effect.parameters) for effect in self.effects})
        for node_id, layout in self.layout.items():
            keys = layout.ignoredParameters
            if len(keys) != len(set(keys)) or not set(keys) <= parameter_keys[node_id]:
                raise ValueError(f"Invalid ignored parameters for {node_id}")
        edges = {(e.from_, e.to) for e in self.connections}
        if len(edges) != len(self.connections):
            raise ValueError("Duplicate audio connection")
        for source, target in edges:
            if source not in source_ids | effect_ids or target not in effect_ids | {"master"}:
                raise ValueError("Audio connection references an invalid port")
        visiting, visited = set(), set()
        def visit(node):
            if node in visiting:
                raise ValueError("Audio connections contain a cycle")
            if node in visited:
                return
            visiting.add(node)
            for source, target in edges:
                if source == node:
                    visit(target)
            visiting.remove(node)
            visited.add(node)
        for node in source_ids | effect_ids:
            visit(node)
        # JSON must stay portable: reject NaN/Infinity even for open parameter maps.
        try:
            json.dumps(self.model_dump(by_alias=True), allow_nan=False)
        except ValueError as exc:
            raise ValueError("Setup contains a non-finite value") from exc
        return self


class SaveSetupRequest(StoredModel):
    name: str = Field(min_length=1, max_length=100)
    setup: PatchSetup


class DefaultSelection(StoredModel):
    setupId: str | None


def create_setup_router(data_dir: Path, samples_dir: Path) -> APIRouter:
    router = APIRouter()
    setup_dir = data_dir / "setups"
    audio_dir = data_dir / "setup_audio"
    setup_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)
    lock = threading.RLock()

    def setup_path(setup_id: str) -> Path:
        if not re.fullmatch(r"[0-9a-f]{32}", setup_id):
            raise HTTPException(400, "Invalid setup ID")
        return setup_dir / f"{setup_id}.json"

    def read_setup(setup_id: str):
        path = setup_path(setup_id)
        if not path.is_file():
            raise HTTPException(404, "Setup not found")
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            PatchSetup.model_validate(value["setup"])
            return value
        except (ValueError, KeyError) as exc:
            raise HTTPException(500, "Stored setup is invalid") from exc

    def write_json(path: Path, value):
        temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
        try:
            temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8")
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)

    def default_id():
        path = setup_dir / "default.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8")).get("setupId")
        except ValueError:
            return None

    def persist_samples(setup: PatchSetup):
        for module in setup.modules:
            if module.type == "piano_sampler":
                for filename in {key.filename for key in module.bank.samples}:
                    piano_sample_path(samples_dir / "piano", filename)
                continue
            sample = module.sample
            if sample is None:
                continue
            if sample.kind == "builtin":
                filename = sample.filename or ""
                if not re.fullmatch(r"[\w.-]+\.(wav|aif|aiff|mp3|m4a|ogg)", filename, re.IGNORECASE) or not (samples_dir / filename).is_file():
                    raise HTTPException(422, f"Sample is not present: {filename}")
                sample.audioBase64 = None
            elif sample.audioBase64:
                try:
                    audio = base64.b64decode(sample.audioBase64, validate=True)
                    with wave.open(io.BytesIO(audio), "rb") as wav:
                        if wav.getnchannels() not in (1, 2) or wav.getsampwidth() != 2 or wav.getnframes() == 0:
                            raise ValueError("Expected nonempty mono/stereo PCM16 audio")
                        frames = wav.getnframes()
                        if len(wav.readframes(frames)) != frames * wav.getnchannels() * 2:
                            raise ValueError("Incomplete WAV audio")
                except (ValueError, binascii.Error, wave.Error, EOFError) as exc:
                    raise HTTPException(422, "Setup sample must be valid PCM WAV audio") from exc
                filename = hashlib.sha256(audio).hexdigest() + ".wav"
                path = audio_dir / filename
                if not path.exists():
                    temporary = audio_dir / f".{uuid.uuid4().hex}.tmp"
                    temporary.write_bytes(audio)
                    os.replace(temporary, path)
                sample.filename = filename
                sample.audioBase64 = None
            elif not sample.filename or not re.fullmatch(r"[0-9a-f]{64}\.wav", sample.filename) or not (audio_dir / sample.filename).is_file():
                raise HTTPException(422, "Stored setup audio is unavailable")

    def summary(value):
        return {key: value[key] for key in ("id", "name", "createdAt", "updatedAt")}

    @router.get("/api/setups")
    def list_setups():
        with lock:
            items = [summary(read_setup(path.stem)) for path in setup_dir.glob("*.json") if path.stem != "default"]
            return {"setups": sorted(items, key=lambda item: item["updatedAt"], reverse=True), "defaultId": default_id()}

    @router.post("/api/setups", status_code=201)
    def create_setup(request: SaveSetupRequest):
        with lock:
            name = request.name.strip()
            if not name:
                raise HTTPException(422, "Enter a setup name")
            persist_samples(request.setup)
            setup_id = uuid.uuid4().hex
            now = datetime.now(timezone.utc).isoformat()
            value = {"id": setup_id, "name": name, "createdAt": now, "updatedAt": now,
                     "setup": request.setup.model_dump(by_alias=True, exclude_none=True)}
            write_json(setup_path(setup_id), value)
            return summary(value)

    @router.put("/api/setups/default")
    def select_default(request: DefaultSelection):
        with lock:
            if request.setupId:
                read_setup(request.setupId)
            write_json(setup_dir / "default.json", request.model_dump())
            return {"defaultId": request.setupId}

    @router.get("/api/setups/{setup_id}")
    def get_setup(setup_id: str):
        with lock:
            return read_setup(setup_id)

    @router.put("/api/setups/{setup_id}")
    def update_setup(setup_id: str, request: SaveSetupRequest):
        with lock:
            old = read_setup(setup_id)
            name = request.name.strip()
            if not name:
                raise HTTPException(422, "Enter a setup name")
            persist_samples(request.setup)
            value = {**old, "name": name, "updatedAt": datetime.now(timezone.utc).isoformat(),
                     "setup": request.setup.model_dump(by_alias=True, exclude_none=True)}
            write_json(setup_path(setup_id), value)
            return summary(value)

    @router.get("/api/setup-audio/{filename}")
    def setup_audio(filename: str):
        if not re.fullmatch(r"[0-9a-f]{64}\.wav", filename):
            raise HTTPException(400, "Invalid audio filename")
        path = audio_dir / filename
        if not path.is_file():
            raise HTTPException(404, "Setup audio not found")
        return FileResponse(path, media_type="audio/wav")

    return router
