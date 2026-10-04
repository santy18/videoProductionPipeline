#!/usr/bin/env python3
"""Create projects/<slug>/ with stage folders and project.json."""
import argparse, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import FORMATS, STAGES, save, slugify

ap = argparse.ArgumentParser()
ap.add_argument("title")
ap.add_argument("--format", choices=FORMATS, default="short")
ap.add_argument("--root", default="projects")
ap.add_argument("--provider", default="qwen", help="elevenlabs|openai|qwen|edge|silent")
ap.add_argument("--wpm", type=int, default=160, help="speaking rate used for estimates")
a = ap.parse_args()

proj = Path(a.root) / slugify(a.title)
if (proj / "project.json").exists():
    sys.exit(f"{proj} already exists")
for s in STAGES:
    (proj / s).mkdir(parents=True, exist_ok=True)
save(proj / "project.json", {
    "title": a.title,
    "format": a.format, **FORMATS[a.format],
    "wpm": a.wpm,
    "padding_sec": {"head": 0.25, "tail": 0.45},
    "min_scene_sec": 2.0,
    "caption_words_per_chunk": 4 if a.format == "short" else 7,
    "voice": {"provider": a.provider, "qwen_voice": "santy", "fallback": ["edge"], "edge_voice": "en-US-GuyNeural",
              "voice_id": "", "voice": "alloy", "model": ""},
    "style": {"bg": "#0b0f1a", "fg": "#f5f7ff", "accent": "#ffcc33", "font": "Inter, Helvetica, Arial, sans-serif"},
    "music_volume": 0.12,
})
print(proj)
