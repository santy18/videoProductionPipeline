---
name: video-pipeline
description: End-to-end faceless video production line — idea → script → timesheet → voiceover → Remotion motion graphics → final MP4 with captions. Use this skill whenever the user wants to make a video, YouTube Short, TikTok/Reel, explainer, faceless channel content, animated video, voiceover video, or asks to "run the pipeline", "make the next video", continue a video project, render with Remotion, or do any single stage (find video ideas, write a video script, build a timesheet, generate narration/TTS, animate scenes). Trigger even if only one stage is mentioned, since every stage depends on this folder layout.
---

# Video Production Pipeline

A folder-driven production line. Every stage reads the previous stage's folder and writes its own. Because state lives on disk, any stage can be re-run, edited by hand, or resumed in a new chat.

```
projects/<slug>/
├── project.json          # settings: format, fps, voice provider, style
├── 01_idea/idea.json     # chosen idea + alternatives
├── 02_script/script.json # scenes: narration + on-screen content  (+ script.md for humans)
├── 03_timesheet/timesheet.json  # frame-exact timing per scene + caption chunks
├── 04_voice/s01.mp3 …  + manifest.json  # real audio durations
├── 05_motion/            # Remotion project (copied from assets/remotion-template)
└── 06_render/final.mp4  + captions.srt
```

`SKILL_DIR` below = the folder containing this file.

## Always start here

```bash
python3 $SKILL_DIR/scripts/status.py projects/<slug>     # shows which stages are done + the next command
```
New project: `python3 $SKILL_DIR/scripts/new_project.py "<working title or topic>" --format short|long|square`

Then run the stages in order. Stop after each creative stage (idea, script) and show the user a short summary so they can approve or tweak — unless they said "run it all / autopilot".

## Stage 1 — Idea (`01_idea/idea.json`)
Read `references/ideas.md`. Prefer the web_search tool for fresh, niche-specific angles; fall back to `scripts/fetch_ideas.py --niche "<niche>"` (Hacker News + Reddit, no keys). Score 5–8 candidates, pick one, write idea.json.

## Stage 2 — Script (`02_script/script.json`)
Read `references/script.md` — it defines the scene types the motion stage can render (`title, kinetic, bullets, stat, quote, outro`). Only use those types. Write script.json and a readable script.md.

## Stage 3 — Timesheet (`03_timesheet/timesheet.json`)
```bash
python3 $SKILL_DIR/scripts/build_timesheet.py projects/<slug>
```
Before voice exists it estimates from word count (status `estimated`). After stage 4, run it again — it switches to real audio durations (status `synced`). Always re-run after voice.

## Stage 4 — Voice (`04_voice/`)
```bash
python3 $SKILL_DIR/scripts/generate_voice.py projects/<slug> [--provider elevenlabs|openai|qwen|edge|silent]
python3 $SKILL_DIR/scripts/build_timesheet.py projects/<slug>    # re-sync!
```
Read `references/voice.md` for providers/keys. For `qwen`, the local server at /Users/santiagogil/Desktop/Programming/python/qwen3TTS must be started first (steps in voice.md). `silent` makes timed placeholder tracks so the whole line can be tested with zero API keys.

## Stage 5 — Motion (`05_motion/`)
```bash
python3 $SKILL_DIR/scripts/setup_motion.py projects/<slug>   # copies template, voice, timesheet, music
```
Read `references/motion.md` before customizing scenes or adding new scene types. The Remotion composition reads `src/timesheet.json` and sizes itself automatically.

## Stage 6 — Render (`06_render/final.mp4`)
```bash
bash $SKILL_DIR/scripts/render.sh projects/<slug>
```
Renders with Remotion, then ffmpeg loudness-normalises, and writes `captions.srt`. Requires Node 18+ and ffmpeg. Remotion downloads its own headless Chrome on first render; if that download is blocked (sandboxes), find a local one (`find / -name chrome-headless-shell -type f 2>/dev/null`) and run with `REMOTION_BROWSER=<path>`. On 1-CPU machines don't pass `--concurrency`. Extra Remotion flags go in `REMOTION_FLAGS`. After rendering, extract a contact sheet of frames with ffmpeg and look at it before telling the user it's done.

## Rules
- Never skip the timesheet re-sync after voice; out-of-sync captions are the #1 failure.
- Edits go upstream: change script.json, then re-run 3 → 4 → 3 → 5 → 6. Don't hand-edit timesheet frames.
- Keep `project.json` as the single source of format/fps/voice settings.
- Only use music/fonts/images the user owns or that are licensed for reuse; drop music in `assets/music.mp3` of the project.
- Batch mode: for "make N videos", loop new_project → stages per project; status.py on each at the end.
