#!/usr/bin/env python3
"""Write 06_render/captions.srt from the timesheet's caption chunks."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import load

proj = Path(sys.argv[1]); ts = load(proj / "03_timesheet/timesheet.json"); fps = ts["fps"]
def t(f):
    ms = int(round(f / fps * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
lines, n = [], 1
for sc in ts["scenes"]:
    for c in sc["captions"]:
        lines += [str(n), f"{t(sc['start_frame'] + c['from'])} --> {t(sc['start_frame'] + c['to'])}", c["text"], ""]; n += 1
(proj / "06_render").mkdir(exist_ok=True)
(proj / "06_render/captions.srt").write_text("\n".join(lines), encoding="utf-8")
print(f"{n-1} captions → 06_render/captions.srt")
