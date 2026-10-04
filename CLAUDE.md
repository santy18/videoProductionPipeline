# Video Studio

This workspace produces videos with the **video-pipeline** skill. Always use that skill for any video work, and start every task by running its `status.py` on the relevant project.

## Layout
- `projects/<slug>/` — one folder per video (created by `new_project.py`, stages 01–06 inside)
- `assets/music/` — licensed background tracks; copy one to `projects/<slug>/assets/music.mp3`
- `ideas-backlog.md` — running list of unused ideas; add leftovers from stage 1 here
- `published.md` — log of finished videos (title, date, slug, URL)

## Channel defaults  ← edit these
- Niche: space & science facts
- Audience: curious adults, no jargon
- Format: `short` (vertical 1080×1920, 30–50 s, 6–8 scenes)
- Tone: punchy, a little playful, never clickbait-false
- Voice: provider `qwen` (local server, voice `santy`; start it per README before voice stage), fallback `edge` / `en-US-GuyNeural`
- Style: bg `#0b0f1a`, text `#f5f7ff`, accent `#ffcc33`
- Visuals: stylized flat illustration (bold shapes, paper grain, navy/amber/coral), one story + 1–2 characters per video (no channel mascot); images via Higgsfield `nano_banana_2_lite`, ~1 credit each, budget ≤ 20 credits per video (`visuals.max_credits` 25 is the hard cap)
- CTA on the outro: "Follow for more"

When creating a project, write these defaults into its `project.json`.

## Workflow rules
- Pause for my approval after the **idea** and after the **script + art direction** — unless I say "autopilot".
- Read `references/creative.md` before writing any script: 10–14 scenes of 3–5 s, a `visual` for each, `art_direction.json` for style and characters.
- Before spending credits run `generate_visuals.py --dry-run` and state the estimate; then inspect the generated images (contact sheet) and regenerate bad ones with `--only <id> --force`.
- Every factual claim and quote needs a source in `idea.json`; never invent attributions.
- After voice, always re-run `build_timesheet.py` before motion.
- After rendering, extract a contact sheet of frames and check it before saying it's done.
- Fix problems upstream (edit `script.json`, re-run later stages); never hand-edit timesheet frames.
- When a video is finished, append it to `published.md` and remove its idea from `ideas-backlog.md`.

## Environment
- API keys come from env vars `ELEVENLABS_API_KEY` / `OPENAI_API_KEY` — never write them into files.
- If Remotion can't download Chrome, set `REMOTION_BROWSER` to a local chrome-headless-shell path.
- Only use music, fonts and images I own or that are licensed for reuse.