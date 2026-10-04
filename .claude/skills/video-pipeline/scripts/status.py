#!/usr/bin/env python3
"""Show pipeline progress for a project and the next command to run."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import load, plan_visuals, visuals_state

proj = Path(sys.argv[1]); S = Path(__file__).parent
ts = proj / "03_timesheet/timesheet.json"
visuals_check, vstale = [], []
if plan_visuals(proj)["items"]:
    _, _, vmissing, vstale = visuals_state(proj)
    visuals_check = [("visuals", not vmissing and not vstale,
                      f"python3 {S}/generate_visuals.py {proj} --dry-run   # then without --dry-run")]
checks = [
    ("idea",      (proj / "01_idea/idea.json").exists(),       "Write 01_idea/idea.json (see references/ideas.md)"),
    ("script",    (proj / "02_script/script.json").exists(),   "Write 02_script/script.json (see references/script.md)"),
    ("timesheet", ts.exists(),                                  f"python3 {S}/build_timesheet.py {proj}"),
    ("voice",     (proj / "04_voice/manifest.json").exists(),  f"python3 {S}/generate_voice.py {proj}"),
    ("synced",    ts.exists() and load(ts).get("status") == "synced", f"python3 {S}/build_timesheet.py {proj}"),
    *visuals_check,
    ("motion",    (proj / "05_motion/src/timesheet.json").exists(), f"python3 {S}/setup_motion.py {proj}"),
    ("render",    (proj / "06_render/final.mp4").exists(),     f"bash {S}/render.sh {proj}"),
    ("description", (proj / "07_publish/description.md").exists(), "Write 07_publish/description.md (see references/publish.md)"),
]
# stale checks: upstream newer than downstream
def mtime(p): return p.stat().st_mtime if p.exists() else 0
stale = []
if mtime(proj/"02_script/script.json") > mtime(ts) > 0: stale.append("script changed after timesheet → re-run stages 3–6")
if mtime(proj/"04_voice/manifest.json") > mtime(ts) > 0: stale.append("voice newer than timesheet → re-run build_timesheet.py")
if mtime(ts) > mtime(proj/"05_motion/src/timesheet.json") > 0: stale.append("timesheet newer than motion copy → re-run setup_motion.py")

for k in vstale: stale.append(f"visual '{k}' prompt/character changed after generation → generate_visuals.py (regenerates only stale)")
desc = proj / "07_publish/description.md"
if desc.exists():
    import re
    tags = re.findall(r"#\w+", desc.read_text(encoding="utf-8"))
    if len(tags) != 5: stale.append(f"description has {len(tags)} hashtags (should be exactly 5)")
if ts.exists():
    t = load(ts)
    if t.get("status") == "synced" and t["height"] > t["width"] and t["total_sec"] > 60:
        stale.append(f"Short is {t['total_sec']:.0f}s, over the 60s max: cut/merge scenes, re-run only changed voice (--only)")
nxt = None
for name, done, cmd in checks:
    print(f"[{'x' if done else ' '}] {name}")
    if not done and nxt is None: nxt = cmd
for s in stale: print("! " + s)
print("\nNEXT: " + (nxt or "done — 06_render/final.mp4 + 07_publish/description.md"))
