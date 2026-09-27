"""Discover piano recordings, expand SFZ key zones, and serve existing bank files."""
import hashlib
import json
import math
import re
import wave
from pathlib import Path, PureWindowsPath

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

AUDIO_EXTENSIONS = {".wav", ".aif", ".aiff", ".mp3", ".m4a", ".ogg"}


def piano_sample_path(directory: Path, filename: str) -> Path:
    filename = filename.replace("\\", "/")
    if not filename or ":" in filename or PureWindowsPath(filename).drive or filename.startswith("/") or any(part in ("", ".", "..") for part in filename.split("/")) or Path(filename).suffix.lower() not in AUDIO_EXTENSIONS:
        raise HTTPException(422, "Invalid piano sample filename")
    path = directory / filename
    if not path.resolve().is_relative_to(directory.resolve()) or not path.is_file():
        raise HTTPException(404, f"Piano sample is not present: {filename}")
    return path


def sfz_key(value: str) -> int:
    if re.fullmatch(r"\d{1,3}", value):
        midi = int(value)
    else:
        match = re.fullmatch(r"([A-Ga-g])([#b]?)(-?\d)", value)
        if not match:
            raise ValueError(f"Invalid SFZ key: {value}")
        letter, accidental, octave = match.groups()
        midi = (int(octave) + 1) * 12 + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[letter.upper()] + {"": 0, "#": 1, "b": -1}[accidental]
    if not 0 <= midi <= 127:
        raise ValueError(f"SFZ key outside MIDI range: {value}")
    return midi


def read_sfz_bank(directory: Path, sfz: Path):
    """The single-layer SFZ subset used by this piano; reject unsupported synthesis."""
    try:
        original = sfz.read_text(encoding="utf-8-sig")
        name_match = re.search(r"^\s*//\+\s*Name:\s*(.+)$", original, re.MULTILINE)
        name = name_match.group(1).strip()[:120] if name_match else sfz.stem
        text = re.sub(r"/\*.*?\*/|//[^\n]*", "", original, flags=re.DOTALL)
        headers = list(re.finditer(r"<([^>]+)>", text))
        if not headers or text[:headers[0].start()].strip() or re.search(r"^\s*#", text, re.MULTILINE):
            raise ValueError("Expected SFZ headers; includes and macros are not supported")
        global_values, group_values, regions = {}, {}, []
        default_path = ""
        supported = {"lokey", "hikey", "key", "pitch_keycenter", "sample", "loop_mode", "loop_start", "loop_end", "ampeg_release"}
        for index, header in enumerate(headers):
            scope = header.group(1).strip().lower()
            block = text[header.end():headers[index + 1].start() if index + 1 < len(headers) else len(text)].strip()
            matches = list(re.finditer(r"([A-Za-z_]\w*)\s*=\s*(.*?)(?=\s+[A-Za-z_]\w*\s*=|$)", block, re.DOTALL))
            if block and (not matches or block[:matches[0].start()].strip()):
                raise ValueError(f"Invalid opcodes in <{scope}>")
            values = {match.group(1).lower(): match.group(2).strip().strip('"') for match in matches}
            if scope == "control":
                if set(values) - {"default_path"}:
                    raise ValueError("Only default_path is supported in <control>")
                default_path = values.get("default_path", "").replace("\\", "/")
                if default_path and not default_path.endswith("/"):
                    default_path += "/"
                continue
            if scope not in ("global", "group", "region") or set(values) - supported:
                raise ValueError(f"Unsupported SFZ header/opcodes in <{scope}>: {', '.join(sorted(set(values) - supported))}")
            if scope == "global":
                global_values = values
                group_values = {}
            elif scope == "group":
                group_values = values
            else:
                regions.append({**global_values, **group_values, **values})
        if not regions:
            raise ValueError("SFZ contains no sample regions")
        entries, flattened, releases = [], set(), set()
        audio_info = {}
        for region in regions:
            low = sfz_key(region.get("lokey", region.get("key", "0")))
            high = sfz_key(region.get("hikey", region.get("key", "127")))
            root = sfz_key(region.get("pitch_keycenter", region.get("key", "60")))
            if low > high:
                raise ValueError("SFZ lokey exceeds hikey")
            filename = (default_path + region["sample"]).replace("\\", "/")
            try:
                path = piano_sample_path(directory, filename)
            except HTTPException as exc:
                # This supplied bank has flattened the original SFZ samples/ folder.
                if exc.status_code != 404 or "/" not in filename:
                    raise
                path = piano_sample_path(directory, Path(filename).name)
                flattened.add(filename)
            filename = path.relative_to(directory).as_posix()
            mode = region.get("loop_mode", "no_loop")
            if mode not in ("no_loop", "loop_continuous"):
                raise ValueError(f"Unsupported loop_mode: {mode}")
            mapping = {"filename": filename, "rootMidi": root, "loopMode": mode}
            if mode == "loop_continuous":
                if path not in audio_info:
                    with wave.open(str(path), "rb") as audio:
                        audio_info[path] = (audio.getframerate(), audio.getnframes())
                sample_rate, frames = audio_info[path]
                start, end = int(region["loop_start"]), int(region["loop_end"])
                if not 0 <= start < end < frames:
                    raise ValueError(f"Invalid loop frames for {filename}")
                # SFZ end is inclusive. Seconds use the recording rate, before browser resampling.
                mapping.update(loopStartSeconds=start / sample_rate, loopEndSeconds=(end + 1) / sample_rate)
            release = float(region.get("ampeg_release", "0.001"))
            if not math.isfinite(release) or not 0 <= release <= 10:
                raise ValueError("SFZ ampeg_release must be between 0 and 10 seconds")
            releases.add(release)
            entries.extend({"midi": midi, **mapping} for midi in range(max(21, low), min(108, high) + 1))
        if len(releases) != 1:
            raise ValueError("Per-region release envelopes are not supported; use one ampeg_release")
        warnings = [f"Resolved {len(flattened)} SFZ sample paths from the flattened piano folder."] if flattened else []
        return name, entries, warnings, {"sfz": sfz.name, "defaultReleaseSeconds": releases.pop()}, original
    except (ValueError, KeyError, OSError, EOFError, wave.Error) as exc:
        raise HTTPException(422, f"Cannot read piano SFZ {sfz.name}: {exc}") from exc


def note_from_filename(stem: str):
    if re.fullmatch(r"\d{1,3}", stem):
        return int(stem)
    match = re.search(r"(?:^|[_ -])([A-Ga-g])([#b]?)(-?\d)$", stem)
    if not match:
        return None
    letter, accidental, octave = match.groups()
    return (int(octave) + 1) * 12 + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[letter.upper()] + {"": 0, "#": 1, "b": -1}[accidental]


def read_piano_bank(directory: Path):
    directory.mkdir(parents=True, exist_ok=True)
    manifest = directory / "bank.json"
    warnings = []
    name = "Piano"
    metadata, source_text, data = {}, "", {}
    if manifest.is_file():
        try:
            data = json.loads(manifest.read_text(encoding="utf-8-sig"))
            if not isinstance(data, dict):
                raise ValueError("manifest must be an object")
            name = str(data.get("name", name))[:120]
            if "samples" in data and not isinstance(data["samples"], list):
                raise ValueError("samples must be an array")
        except (ValueError, KeyError, TypeError) as exc:
            raise HTTPException(422, "Piano bank.json needs an sfz filename or a samples array of {midi, filename} objects") from exc
    sfz_files = sorted(directory.glob("*.sfz"))
    if "samples" in data:
        entries = data["samples"]
        source_text = manifest.read_text(encoding="utf-8-sig")
    elif sfz_files or "sfz" in data:
        if "sfz" in data:
            selected = data["sfz"]
            if not isinstance(selected, str) or Path(selected).name != selected or "/" in selected or "\\" in selected:
                raise HTTPException(422, "bank.json sfz must name a file in the piano folder")
            sfz = directory / selected
            if sfz.suffix.lower() != ".sfz" or not sfz.is_file() or not sfz.resolve().is_relative_to(directory.resolve()):
                raise HTTPException(422, "Selected piano SFZ is not present")
        elif len(sfz_files) == 1:
            sfz = sfz_files[0]
        else:
            raise HTTPException(422, "Multiple piano SFZ files: select one using bank.json with an sfz field")
        if not sfz.resolve().is_relative_to(directory.resolve()):
            raise HTTPException(422, "Piano SFZ must be contained in the piano folder")
        name, entries, warnings, metadata, source_text = read_sfz_bank(directory, sfz)
        name = str(data.get("name", name))[:120]
    else:
        entries = []
        for path in sorted(directory.iterdir()):
            if not path.is_file() or path.suffix.lower() not in AUDIO_EXTENSIONS:
                continue
            midi = note_from_filename(path.stem)
            if midi is None or not 21 <= midi <= 108:
                warnings.append(f"Could not map {path.name}; add it to bank.json with its MIDI key.")
            else:
                entries.append({"midi": midi, "filename": path.name})
    samples, seen, identity = [], set(), []
    for entry in entries:
        if not isinstance(entry, dict) or type(entry.get("midi")) is not int or not 21 <= entry["midi"] <= 108 or not isinstance(entry.get("filename"), str):
            raise HTTPException(422, "Piano entries need MIDI 21–108 and a filename")
        midi, filename = entry["midi"], entry["filename"]
        if midi in seen:
            raise HTTPException(422, f"Piano MIDI {midi} has multiple samples; choose one in bank.json")
        path = piano_sample_path(directory, filename)
        stat = path.stat()
        sample = {"midi": midi, "filename": filename.replace("\\", "/")}
        root = entry.get("rootMidi", midi)
        if type(root) is not int or not 0 <= root <= 127:
            raise HTTPException(422, "Piano rootMidi must be MIDI 0–127")
        sample["rootMidi"] = root
        mode = entry.get("loopMode", "no_loop")
        if mode not in ("no_loop", "loop_continuous"):
            raise HTTPException(422, "Piano loopMode must be no_loop or loop_continuous")
        sample["loopMode"] = mode
        if mode == "loop_continuous":
            start, end = entry.get("loopStartSeconds"), entry.get("loopEndSeconds")
            if type(start) not in (int, float) or type(end) not in (int, float) or not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end:
                raise HTTPException(422, "Piano loop needs valid start/end seconds")
            sample.update(loopStartSeconds=start, loopEndSeconds=end)
        seen.add(midi)
        samples.append(sample)
        identity.append((midi, sample, stat.st_size, stat.st_mtime_ns))
    revision = hashlib.sha256(json.dumps([source_text, metadata, sorted(identity)]).encode()).hexdigest()
    return {"name": name, "revision": revision, "samples": sorted(samples, key=lambda sample: sample["midi"]), "warnings": warnings, **metadata}


def create_piano_router(directory: Path):
    router = APIRouter()

    @router.get("/api/piano-bank")
    def bank():
        return read_piano_bank(directory)

    @router.get("/api/piano-samples/{filename:path}")
    def audio(filename: str):
        return FileResponse(piano_sample_path(directory, filename))

    return router
