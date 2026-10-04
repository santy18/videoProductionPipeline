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
├── 03_visuals/           # generated b-roll images + characters/ + manifest.json (prompt hashes)
├── 04_voice/s01.mp3 …  + manifest.json  # real audio durations
├── 05_motion/            # Remotion project (copied from assets/remotion-template)
├── 06_render/final.mp4  + captions.srt
└── 07_publish/description.md   # TikTok + Instagram caption, keywords, 5 hashtags
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
Read `references/script.md` — it defines the scene types the motion stage can render (`title, kinetic, bullets, stat, quote, outro`). Only use those types (`title, kinetic, bullets, stat, quote, outro, broll, diagram`). Write script.json and a readable script.md.

## Stage 2b — Creative direction & visuals (`02_script/art_direction.json`, `03_visuals/`)
Read `references/creative.md` **before** writing the script: it defines the story/characters, pacing (10–14 short scenes),
shot variety, `art_direction.json`, and the per-scene `visual` block. Present script + art direction together for approval.
After approval, generate the pictures (costs Higgsfield credits, ~1 per image — always dry-run first and state the estimate):
```bash
python3 $SKILL_DIR/scripts/generate_visuals.py projects/<slug> --dry-run    # estimate, spends nothing
python3 $SKILL_DIR/scripts/generate_visuals.py projects/<slug> [--only s03,mia] [--force]
```
Only missing/stale images are generated, so re-runs are free. **Look at the images** (contact sheet) and regenerate bad ones with `--only <id> --force` before moving on. Needs the `higgsfield` CLI logged in; images are 1 credit each (`nano_banana_2_lite`), characters first, then scenes with the characters as references.

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

## Stage 7 — Publish description (`07_publish/description.md`)
Read `references/publish.md`. After the render, write one caption for TikTok + Instagram: keyword-rich hook line, 2–3 substance
sentences with natural secondary keywords, a comment question, the source line, "Follow for more", and **exactly 5 hashtags**.
Choose keywords from what people would actually search; never stuff or use keywords the video doesn't deliver.

## Rules
- **Length:** target ≈ 50 s for a Short, hard max 60 s. If the synced timesheet lands anywhere up to 60 s, accept it and move on: do not re-edit narration or re-run voice to trim a few seconds (it wastes time and credits). Only if it exceeds 60 s, cut or merge scenes, then re-run only the changed voice with `--only`.
- Never skip the timesheet re-sync after voice; out-of-sync captions are the #1 failure.
- Edits go upstream: change script.json, then re-run 3 → 4 → 3 → 5 → 6. Don't hand-edit timesheet frames.
- Keep `project.json` as the single source of format/fps/voice settings.
- Only use music/fonts/images the user owns or that are licensed for reuse; drop music in `assets/music.mp3` of the project.
- Batch mode: for "make N videos", loop new_project → stages per project; status.py on each at the end.
