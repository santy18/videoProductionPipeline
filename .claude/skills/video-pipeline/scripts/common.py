"""Shared helpers for the video pipeline."""
import json, re, subprocess
from pathlib import Path

FORMATS = {
    "short":  {"width": 1080, "height": 1920, "fps": 30},
    "long":   {"width": 1920, "height": 1080, "fps": 30},
    "square": {"width": 1080, "height": 1080, "fps": 30},
}
STAGES = ["01_idea", "02_script", "03_timesheet", "04_voice", "05_motion", "06_render"]

def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))

def save(p, data):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:50] or "video"

def words(text):
    return re.findall(r"\S+", text or "")

def audio_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        raise RuntimeError(f"ffprobe could not read {path}: {out.stderr}")
