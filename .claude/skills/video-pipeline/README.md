# video-pipeline skill
Folder-based production line: idea → script → timesheet → voice → Remotion motion → final.mp4 + captions.srt.
Install: upload `video-pipeline.skill` (Settings → Capabilities → Skills), or copy this folder to `~/.claude/skills/` for Claude Code.
Then just ask: "Make a 45-second Short about why the Moon drifts away" or "run the pipeline on projects/<slug>".
Voice: set ELEVENLABS_API_KEY or OPENAI_API_KEY and `voice.provider` in project.json; `silent` works with no keys.
