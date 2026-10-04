#!/usr/bin/env python3
"""Generate one narration file per scene into 04_voice/ and write manifest.json with real durations."""
import argparse, asyncio, os, struct, sys, time, wave
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import audio_duration, load, save, words

ap = argparse.ArgumentParser()
ap.add_argument("project")
ap.add_argument("--provider", help="force one provider, no fallback")
ap.add_argument("--only", help="comma-separated scene ids to (re)generate")
a = ap.parse_args()
proj = Path(a.project)
cfg = load(proj / "project.json"); v = cfg["voice"]
provider = a.provider or v.get("provider", "silent")
script = load(proj / "02_script/script.json")
out = proj / "04_voice"; out.mkdir(exist_ok=True)
man_p = out / "manifest.json"
manifest = load(man_p) if man_p.exists() else {"scenes": {}}
only = set(a.only.split(",")) if a.only else None

def tts_elevenlabs(text, dst):
    import requests
    key = os.environ["ELEVENLABS_API_KEY"]; vid = v.get("voice_id")
    if not vid or vid == "REPLACE_ME": raise RuntimeError("set voice.voice_id in project.json")
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
                      headers={"xi-api-key": key, "Content-Type": "application/json"},
                      json={"text": text, "model_id": v.get("model") or "eleven_multilingual_v2"}, timeout=120)
    r.raise_for_status(); dst.write_bytes(r.content)

def tts_openai(text, dst):
    import requests
    body = {"model": v.get("model") or "gpt-4o-mini-tts", "voice": v.get("voice") or "alloy", "input": text, "response_format": "mp3"}
    if v.get("instructions"): body["instructions"] = v["instructions"]
    r = requests.post("https://api.openai.com/v1/audio/speech",
                      headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"}, json=body, timeout=120)
    r.raise_for_status(); dst.write_bytes(r.content)

def tts_qwen(text, dst):
    import requests
    base = (v.get("url") or os.environ.get("QWEN_TTS_URL") or "http://localhost:8000").rstrip("/")
    body = {"text": text, "voice": v.get("qwen_voice") or "santy"}
    if v.get("ref_text"): body["ref_text"] = v["ref_text"]
    r = requests.post(f"{base}/generate", json=body, timeout=30); r.raise_for_status()
    jid = r.json()["id"]; deadline = time.time() + float(v.get("timeout_sec", 300))
    while time.time() < deadline:
        j = requests.get(f"{base}/jobs/{jid}", timeout=30); j.raise_for_status(); j = j.json()
        if j["status"] == "completed": break
        if j["status"] == "failed": raise RuntimeError(f"qwen job {jid} failed: {j.get('error')}")
        time.sleep(2)
    else:
        raise TimeoutError(f"qwen job {jid} not done after {v.get('timeout_sec', 300)}s")
    a = requests.get(f"{base}/jobs/{jid}/audio", timeout=120); a.raise_for_status(); dst.write_bytes(a.content)

def tts_edge(text, dst):
    import edge_tts
    name = v.get("edge_voice") or (v.get("voice") if "Neural" in (v.get("voice") or "") else None)
    asyncio.run(edge_tts.Communicate(text, name or "en-US-GuyNeural").save(str(dst)))

def tts_silent(text, dst):
    sec = max(0.5, len(words(text)) / cfg["wpm"] * 60); rate = 24000
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(struct.pack("<h", 0) * int(sec * rate))

ENGINES = {"elevenlabs": (tts_elevenlabs, "mp3"), "openai": (tts_openai, "mp3"),
           "edge": (tts_edge, "mp3"), "qwen": (tts_qwen, "wav"), "silent": (tts_silent, "wav")}
KEYS = {"elevenlabs": "ELEVENLABS_API_KEY", "openai": "OPENAI_API_KEY"}
# chain: forced provider alone, else configured provider then voice.fallback (default: edge). `silent` only if asked for.
chain = [provider] if a.provider else [provider] + [p for p in v.get("fallback", ["edge"]) if p != provider]
chain = [p for p in chain if p in ENGINES]
if not chain: sys.exit(f"unknown voice provider; choose from {', '.join(ENGINES)}")
for p in chain[:]:
    if p in KEYS and not os.environ.get(KEYS[p]):
        print(f"skip {p}: {KEYS[p]} not set", file=sys.stderr); chain.remove(p)
if not chain: sys.exit("no usable voice provider (missing keys); try --provider edge or silent")
provider = chain[0]
for s in script["scenes"]:
    if only and s["id"] not in only: continue
    text = s.get("narration", "").replace("*", "").strip()
    if not text: continue
    while True:
        fn, ext = ENGINES[provider]
        dst = out / f"{s['id']}.{ext}"
        try:
            fn(text, dst); break
        except Exception as e:
            chain.remove(provider)
            if not chain: sys.exit(f"{s['id']}: {provider} failed ({e}); no providers left")
            print(f"{provider} failed ({type(e).__name__}: {e}) -> falling back to {chain[0]}", file=sys.stderr)
            provider = chain[0]
    for old in out.glob(f"{s['id']}.*"):
        if old != dst: old.unlink()
    d = audio_duration(dst)
    manifest["scenes"][s["id"]] = {"file": dst.name, "duration_sec": round(d, 3), "provider": provider}
    print(f"{s['id']}: {d:.2f}s  ({provider})")
# drop scenes that no longer exist in the script
ids = {s["id"] for s in script["scenes"]}
manifest["scenes"] = {k: x for k, x in manifest["scenes"].items() if k in ids}
save(man_p, manifest)
print("manifest written → now re-run build_timesheet.py")
