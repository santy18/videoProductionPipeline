# Stage 4 — Voice

`generate_voice.py` makes one audio file per scene plus `manifest.json` with measured durations. Provider comes from `--provider` or `project.json → voice.provider`.

| provider | needs | notes |
|---|---|---|
| `elevenlabs` | env `ELEVENLABS_API_KEY`; `voice.voice_id` | best quality; model `eleven_multilingual_v2` (override `voice.model`) |
| `openai` | env `OPENAI_API_KEY`; `voice.voice` e.g. `alloy`, `onyx` | model `gpt-4o-mini-tts` (override `voice.model`); `voice.instructions` sets delivery style |
| `qwen` | local Qwen3-TTS server (see below); no key | clones the "santy" voice; slow, async, runs offline |
| `edge` | `pip install edge-tts`; `voice.voice` e.g. `en-US-GuyNeural` | free, needs internet |
| `silent` | nothing | placeholder WAVs at estimated length, for testing the line |

Only clone or imitate a voice the user owns or has permission to use.
Regenerate one scene after an edit with `--only s03`. Always re-run `build_timesheet.py` afterwards.

## Local Qwen3-TTS server (`qwen`)
Local FastAPI server (CrunchBacon) at `http://localhost:8000` (override with `voice.url` or env `QWEN_TTS_URL`). No auth.

**Start it** (it must be running before generating voice; if it is down, `generate_voice.py` falls back to the next provider):
```bash
cd /Users/santiagogil/Desktop/Programming/python/qwen3TTS/backend
conda activate qwen-tts          # first-time setup: see that repo's readme.md
python run.py                    # = uvicorn app:app --host 0.0.0.0 --port 8000
curl -s localhost:8000/openapi.json | head -c 120   # title should be "MLX Qwen3 TTS API"
```
Port 8000 is shared with other local dev servers. If `/openapi.json` shows a title other than the TTS server, stop that process or start this one on another port and set `voice.url`.

**API** (what `generate_voice.py` does per scene):
1. `POST /generate` with `{"text": "...", "voice": "santy"}` returns a job `{"id": 12, "status": "pending"}`. Optional `"ref_text"` (transcript of santy.wav) can improve the voice match.
2. Poll `GET /jobs/{id}` every ~2 s until `status` is `completed` (`pending|processing|completed|failed`; read `error` if failed).
3. `GET /jobs/{id}/audio` returns audio/wav (24 kHz); 409 if not finished.

Errors: 503 = TTS model not loaded; job error `Voice 'santy' not found` = the voice hasn't been uploaded.

Settings in `project.json → voice`: `provider: "qwen"`, `qwen_voice` (default `santy`), `ref_text` (optional), `url` (optional), `timeout_sec` (per scene, default 300).

## Automatic fallback
`generate_voice.py` tries `voice.provider`, then each name in `voice.fallback` (default `["edge"]`). A provider with no env key is skipped; one that errors at runtime (dead/revoked key, quota, network) is dropped and the next takes over for the remaining scenes. `silent` is never used automatically. `--provider X` disables fallback. Set `voice.edge_voice` (e.g. `en-US-GuyNeural`) for the edge voice used as fallback. Ollama is a text-LLM runner and cannot do TTS, so it is not a voice provider.
Check `04_voice/manifest.json` -> `provider` per scene; a mix of voices means re-run the affected scenes with `--only`.
