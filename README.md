# Video Pipeline

A video production line built from one Claude skill and a set of folders. You give Claude a topic; it finds an angle, writes the script, times every scene, records the voiceover, animates it with Remotion, and renders a finished MP4 with captions.

```
 idea ──► script ──► timesheet ──► voice ──► timesheet (re-sync) ──► motion ──► render
 01_idea   02_script  03_timesheet  04_voice                          05_motion  06_render
```

Each stage writes its output into its own numbered folder, and the next stage reads from it. Because everything lives on disk you can stop at any point, edit a file by hand, re-run a single stage, or pick a project back up in a new session.

---

## Contents
- [Video Pipeline](#video-pipeline)
  - [Contents](#contents)
  - [Requirements](#requirements)
  - [Install](#install)
  - [Quick start](#quick-start)
  - [How it works, stage by stage](#how-it-works-stage-by-stage)
    - [1. Idea → `01_idea/idea.json`](#1-idea--01_ideaideajson)
    - [2. Script → `02_script/script.json` + `script.md`](#2-script--02_scriptscriptjson--scriptmd)
    - [3. Timesheet → `03_timesheet/timesheet.json`](#3-timesheet--03_timesheettimesheetjson)
    - [4. Voice → `04_voice/s01.mp3 …` + `manifest.json`](#4-voice--04_voices01mp3---manifestjson)
    - [5. Motion → `05_motion/`](#5-motion--05_motion)
    - [6. Render → `06_render/final.mp4` + `captions.srt`](#6-render--06_renderfinalmp4--captionssrt)
  - [Project folder layout](#project-folder-layout)
  - [Command reference](#command-reference)
  - [Settings: project.json](#settings-projectjson)
  - [Voice providers](#voice-providers)
  - [Changing the look and adding scene types](#changing-the-look-and-adding-scene-types)
  - [Editing and re-running](#editing-and-re-running)
  - [Troubleshooting](#troubleshooting)
  - [What's inside the skill](#whats-inside-the-skill)

---

## Requirements

| Tool | Why | Check |
|---|---|---|
| Python 3.9+ with `requests` | all pipeline scripts | `python3 --version` |
| ffmpeg + ffprobe | audio durations, loudness, final mux | `ffmpeg -version` |
| Node.js 18+ and npm | Remotion rendering | `node --version` |
| Chrome | Remotion downloads its own on first render | — |
| A TTS key (optional) | real narration: ElevenLabs or OpenAI | — |

No keys are needed to test: the `silent` voice provider makes timed placeholder audio so the whole line runs end to end.

## Install

**Claude Code** (all projects):
```bash
mkdir -p ~/.claude/skills
unzip video-pipeline.skill -d ~/.claude/skills/
```
Or for one project only, unzip into `.claude/skills/` at the project root. Restart Claude Code afterwards.

**Windows (PowerShell):**
```powershell
Rename-Item video-pipeline.skill video-pipeline.zip
Expand-Archive video-pipeline.zip -DestinationPath "$HOME\.claude\skills"
```

**claude.ai app:** upload the `.skill` file as-is under Settings → Capabilities → Skills.

Optionally add a `CLAUDE.md` at your workspace root with your channel defaults (niche, voice, colours, approval rules) so you don't repeat them every session.

## Quick start

Just ask Claude in plain language:

> Make a 45-second Short about why the Moon is drifting away.

Claude will create the project, propose an idea, and stop for your approval after the idea and again after the script. Say **"autopilot"** to skip the approvals.

Other useful prompts:
- "Find me 5 video ideas about deep-sea animals"
- "Run the pipeline on projects/why-the-moon-is-drifting-away"
- "Change scene 3 to a list and re-render"
- "Make 3 Shorts about ancient Rome, autopilot"

To run it by hand instead, see the [command reference](#command-reference).

---

## How it works, stage by stage

### 1. Idea → `01_idea/idea.json`
Claude gathers fresh signals with web search (or `fetch_ideas.py`, which pulls from Hacker News and Reddit with no keys), turns topics into specific angles, scores them on hook strength, how visual they are, accuracy risk and timeliness, and saves the winner plus alternatives. Sources for every factual claim are recorded here.

### 2. Script → `02_script/script.json` + `script.md`
The script is a list of scenes. Each scene has the exact **narration** the voice will read and an **on-screen** block for one of six animated layouts:

| type | shows | fields |
|---|---|---|
| `title` | big title card with underline | `title`, `subtitle` |
| `kinetic` | words pop in one by one; `*starred*` words highlighted | `text` |
| `bullets` | numbered list revealed in step with narration | `heading`, `items` |
| `stat` | number counts up inside an animated ring | `value`, `prefix`, `suffix`, `decimals`, `label` |
| `quote` | typewriter quote with attribution | `text`, `author` |
| `outro` | closing line and pulsing call-to-action button | `text`, `cta` |

`script.md` is the same script as a readable table, for reviewing.

### 3. Timesheet → `03_timesheet/timesheet.json`
Converts the script into frame-exact timing: where each scene starts, how long it lasts, when its audio begins, and when each caption chunk appears. It runs **twice**:

- **Before voice** it estimates from word count (status `estimated`) so you can see roughly how long the video will be.
- **After voice** it uses the real audio lengths (status `synced`). This is what makes captions and animations line up with the narration.

Each scene gets a little padding before and after the speech, and never drops below a minimum length.

### 4. Voice → `04_voice/s01.mp3 …` + `manifest.json`
One audio file per scene, generated with your chosen provider. `manifest.json` records each file's measured duration, which the timesheet re-sync uses.

### 5. Motion → `05_motion/`
`setup_motion.py` copies the Remotion template into the project (first time only) and syncs in the latest timesheet, voice files and optional music. The composition sizes itself from the timesheet, so there's nothing to configure. You can preview and scrub it live with `npx remotion studio`.

### 6. Render → `06_render/final.mp4` + `captions.srt`
`render.sh` renders with Remotion, normalises loudness to −14 LUFS (the usual target for YouTube, TikTok and Reels), and exports an SRT caption file for platforms that take uploaded captions. Captions are also burned into the video.

---

## Project folder layout

```
projects/<slug>/
├── project.json              settings for this video (format, voice, style)
├── assets/music.mp3          optional background track (you add this)
├── 01_idea/idea.json
├── 02_script/script.json     ← the main file you edit
├── 02_script/script.md
├── 03_timesheet/timesheet.json   (generated — don't hand-edit)
├── 04_voice/s01.mp3 … manifest.json
├── 05_motion/                full Remotion project
│   ├── src/Video.tsx         assembles scenes, audio, captions, music
│   ├── src/theme.ts          colours, font, safe margins
│   ├── src/scenes/*.tsx      one file per scene type
│   └── public/voice/         copied audio
└── 06_render/final.mp4, raw.mp4, captions.srt
```

## Command reference

`S` = the skill's `scripts/` folder, e.g. `S=~/.claude/skills/video-pipeline/scripts`. `P` = your project folder.

| Step | Command |
|---|---|
| New project | `python3 $S/new_project.py "Topic" --format short\|long\|square [--provider silent]` |
| Where am I? | `python3 $S/status.py $P` |
| Idea signals | `python3 $S/fetch_ideas.py --niche "space" --limit 15` |
| Timesheet | `python3 $S/build_timesheet.py $P` |
| Voice | `python3 $S/generate_voice.py $P [--provider openai] [--only s03,s05]` |
| Re-sync timing | `python3 $S/build_timesheet.py $P` |
| Prepare motion | `python3 $S/setup_motion.py $P` |
| Preview | `cd $P/05_motion && npm i && npx remotion studio` |
| Render | `bash $S/render.sh $P` |
| Captions only | `python3 $S/export_srt.py $P` |

`status.py` is the one to remember. It shows a checklist of finished stages, prints the exact next command, and warns when something is out of date (for example, the script was edited after the voice was made).

Formats: `short` = 1080×1920, `long` = 1920×1080, `square` = 1080×1080, all 30 fps.

## Settings: project.json

Created by `new_project.py`; edit freely.

| Key | Default | Meaning |
|---|---|---|
| `format`, `width`, `height`, `fps` | short, 1080, 1920, 30 | video size |
| `wpm` | 160 | speaking rate used for estimates and silent audio |
| `padding_sec.head` / `.tail` | 0.25 / 0.45 | quiet time before and after each scene's speech |
| `min_scene_sec` | 2.0 | shortest allowed scene |
| `caption_words_per_chunk` | 4 (short), 7 (long) | words shown per caption |
| `voice.provider` | qwen | `elevenlabs`, `openai`, `qwen`, `edge`, `silent` |
| `voice.qwen_voice` / `voice.fallback` / `voice.edge_voice` | santy / [edge] / en-US-GuyNeural | local Qwen voice; fallback chain; edge voice used when falling back |
| `voice.voice_id` | — | ElevenLabs voice ID |
| `voice.voice` | alloy | OpenAI or Edge voice name |
| `voice.model` | — | override the TTS model |
| `voice.instructions` | — | OpenAI only: delivery style, e.g. "energetic, fast" |
| `style.bg` / `fg` / `accent` / `font` | dark navy / white / yellow / Inter | colours and font |
| `music_volume` | 0.12 | background music level (0–1) |

## Voice providers

| Provider | Setup | Notes |
|---|---|---|
| `elevenlabs` | `export ELEVENLABS_API_KEY=…` and set `voice.voice_id` | best quality |
| `openai` | `export OPENAI_API_KEY=…` | good quality, cheap; supports `voice.instructions` |
| `qwen` | local Qwen3-TTS server, see below | clones the "santy" voice, slow, offline |
| `edge` | `pip install edge-tts`; e.g. `voice.voice = en-US-GuyNeural` | free, needs internet |
| `silent` | nothing | placeholder audio for testing |

**Starting the local `qwen` server** (must be up before generating voice; otherwise it falls back):
```bash
cd /Users/santiagogil/Desktop/Programming/python/qwen3TTS/backend
conda activate qwen-tts
python run.py                  # serves http://localhost:8000
curl -s localhost:8000/openapi.json | head -c 120   # title should be "MLX Qwen3 TTS API"
```
Settings in `project.json → voice`: `qwen_voice` (default `santy`), `ref_text` (transcript of santy.wav, optional), `url` (default `http://localhost:8000`, or env `QWEN_TTS_URL`), `timeout_sec`. Generation is async: the script POSTs `/generate`, polls `/jobs/{id}`, then downloads `/jobs/{id}/audio` (WAV, 24 kHz). Full API notes are in `references/voice.md`.

**Fallback:** if the chosen provider has no key or errors, the script moves on to `voice.fallback` (default `["edge"]`). `silent` is never used automatically. `--provider X` disables fallback.

Keep API keys in environment variables, never in project files. Only clone or imitate voices you own or have permission to use.

## Changing the look and adding scene types

**Colours and font:** change `style` in `project.json` (applies on the next timesheet build), or edit `src/theme.ts` in a project for deeper changes.

**Layouts:** each scene type is one file in `05_motion/src/scenes/`. Edit it and preview in Remotion Studio. To make a change apply to all future projects, edit the template in the skill: `assets/remotion-template/src/scenes/`.

**New scene type:**
1. Add `src/scenes/MyScene.tsx` (animate with `useCurrentFrame`, `spring`, `interpolate`).
2. Register it in the `SCENES` map in `src/Video.tsx`.
3. Add its fields to `references/script.md` so Claude knows it can use it in scripts.

Extra Remotion libraries such as `@remotion/lottie`, `@remotion/three`, `@remotion/transitions` and `@remotion/google-fonts` drop in. Install the exact same version as `remotion` (currently 4.0.532).

**Images and music:** put files in `05_motion/public/` (or `assets/music.mp3` for music) and only use material you own or that's licensed for reuse.

## Editing and re-running

The rule is **fix upstream, then flow downstream**. Edit `script.json`, then re-run what comes after it:

| You changed… | Re-run |
|---|---|
| narration text | voice (`--only` the changed scenes) → timesheet → render |
| on-screen text or scene type only | timesheet → render |
| colours or style in project.json | timesheet → render |
| a scene component (.tsx) | render |
| music | render |

`render.sh` runs `setup_motion.py` itself, so the motion folder is always refreshed before rendering. Never hand-edit `timesheet.json`; it's overwritten on every build.

## Troubleshooting

| Problem | Fix |
|---|---|
| Captions or animations drift from the voice | timesheet wasn't re-synced after voice: run `build_timesheet.py` (status should say `synced`) |
| `Host not in allowlist` / Chrome download fails | Remotion can't fetch Chrome. Find a local one with `find / -name chrome-headless-shell -type f 2>/dev/null` and run `REMOTION_BROWSER=<path> bash render.sh $P` |
| `concurrency is set higher than … CPU cores` | don't pass `--concurrency` on small machines |
| `KeyError: 'ELEVENLABS_API_KEY'` (or OpenAI) | export the key in your shell first |
| `set voice.voice_id in project.json` | ElevenLabs needs a voice ID |
| Unknown scene type renders as plain text | the type isn't registered in `SCENES` in `Video.tsx`; it falls back to `kinetic` |
| Text cut off on phones | keep text short; layouts respect `theme.safe` margins but very long lines still wrap |
| Extra Remotion flags | pass them in `REMOTION_FLAGS="--crf=20 …"` |

## What's inside the skill

```
video-pipeline/
├── SKILL.md                 instructions Claude follows (when to trigger, stage order, rules)
├── README.md                this file
├── references/              detail Claude reads only when it reaches that stage
│   ├── ideas.md  script.md  voice.md  motion.md
├── scripts/
│   ├── common.py            shared helpers and format presets
│   ├── new_project.py       create a project
│   ├── status.py            progress, next command, stale warnings
│   ├── fetch_ideas.py       keyless idea signals
│   ├── build_timesheet.py   timing + captions (estimate or synced)
│   ├── generate_voice.py    TTS per scene + manifest
│   ├── setup_motion.py      copy template, sync timesheet/voice/music
│   ├── export_srt.py        captions file
│   └── render.sh            render + loudness + captions
└── assets/remotion-template/   the Remotion project copied into each video
```