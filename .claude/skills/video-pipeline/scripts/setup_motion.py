#!/usr/bin/env python3
"""Copy the Remotion template into 05_motion (first time) and sync timesheet, voice and music into it."""
import shutil, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import load, save

proj = Path(sys.argv[1]); motion = proj / "05_motion"
tpl = Path(__file__).parent.parent / "assets/remotion-template"
ts = load(proj / "03_timesheet/timesheet.json")
if ts["status"] != "synced":
    print("WARNING: timesheet is only estimated — run voice + build_timesheet.py first for real timing")
if not (motion / "package.json").exists():
    shutil.copytree(tpl, motion, dirs_exist_ok=True)
    print("template copied")
pv = motion / "public/voice"; pv.mkdir(parents=True, exist_ok=True)
for f in pv.glob("*"): f.unlink()
for f in (proj / "04_voice").glob("s*.*"):
    shutil.copy(f, pv / f.name)
pi = motion / "public/visuals"; pi.mkdir(parents=True, exist_ok=True)
for f in pi.glob("*"): f.unlink()
for f in (proj / "03_visuals").glob("s*.png"):
    shutil.copy(f, pi / f.name)
music = proj / "assets/music.mp3"
ts["has_music"] = music.exists()
if music.exists():
    shutil.copy(music, motion / "public/music.mp3")
    print("music added")
for sc in ts["scenes"]:
    if sc.get("visual"):
        sc["visual"]["image"] = f"visuals/{sc['id']}.png" if (pi / f"{sc['id']}.png").exists() else None
save(motion / "src/timesheet.json", ts)
print(f"motion ready: {motion}  ({ts['total_sec']}s)")
