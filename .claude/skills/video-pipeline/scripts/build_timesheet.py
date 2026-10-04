#!/usr/bin/env python3
"""Build 03_timesheet/timesheet.json from script.json.
Uses real audio durations from 04_voice/manifest.json when present (status=synced),
otherwise estimates from word count (status=estimated). Also builds caption chunks."""
import math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import load, save, words

proj = Path(sys.argv[1])
cfg = load(proj / "project.json")
script = load(proj / "02_script/script.json")
man_p = proj / "04_voice/manifest.json"
manifest = load(man_p) if man_p.exists() else None
fps = cfg["fps"]; head = cfg["padding_sec"]["head"]; tail = cfg["padding_sec"]["tail"]
per_chunk = cfg.get("caption_words_per_chunk", 4)

synced = manifest is not None and all(s["id"] in manifest["scenes"] for s in script["scenes"])
scenes, cursor = [], 0
for s in script["scenes"]:
    w = words(s.get("narration", ""))
    if synced:
        speech = manifest["scenes"][s["id"]]["duration_sec"]
        audio = "voice/" + manifest["scenes"][s["id"]]["file"]
    else:
        speech = len(w) / cfg["wpm"] * 60
        audio = None
    dur_sec = max(cfg["min_scene_sec"], head + speech + tail)
    dur = math.ceil(dur_sec * fps)
    # caption chunks spread over speech time, weighted by word length
    caps, speech_frames = [], speech * fps
    weights = [len(x) + 2 for x in w]; total = sum(weights) or 1; acc = 0
    for i in range(0, len(w), per_chunk):
        chunk_w = sum(weights[i:i + per_chunk])
        f0 = round(head * fps + acc / total * speech_frames)
        acc += chunk_w
        f1 = round(head * fps + acc / total * speech_frames)
        caps.append({"text": " ".join(w[i:i + per_chunk]).replace("*", ""), "from": f0, "to": max(f1, f0 + 1)})
    scenes.append({
        "id": s["id"], "type": s["type"], "narration": s.get("narration", ""),
        "on_screen": s.get("on_screen", {}),
        "start_frame": cursor, "duration_frames": dur,
        "start_sec": round(cursor / fps, 3), "duration_sec": round(dur / fps, 3),
        "audio": audio, "audio_offset_frames": round(head * fps), "captions": caps,
    })
    cursor += dur

ts = {"title": script.get("title", cfg["title"]), "status": "synced" if synced else "estimated",
      "fps": fps, "width": cfg["width"], "height": cfg["height"],
      "total_frames": cursor, "total_sec": round(cursor / fps, 2),
      "style": cfg["style"], "music_volume": cfg.get("music_volume", 0.12), "scenes": scenes}
save(proj / "03_timesheet/timesheet.json", ts)
print(f"{ts['status']}: {len(scenes)} scenes, {ts['total_sec']}s ({cursor} frames @ {fps}fps)")
for sc in scenes:
    print(f"  {sc['id']} {sc['type']:<8} {sc['start_sec']:>7.2f}s +{sc['duration_sec']:.2f}s")
