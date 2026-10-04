"""Shared helpers for the video pipeline."""
import hashlib, json, re, subprocess
from pathlib import Path

FORMATS = {
    "short":  {"width": 1080, "height": 1920, "fps": 30},
    "long":   {"width": 1920, "height": 1080, "fps": 30},
    "square": {"width": 1080, "height": 1080, "fps": 30},
}
STAGES = ["01_idea", "02_script", "03_timesheet", "03_visuals", "04_voice", "05_motion", "06_render", "07_publish"]
ASPECT = {"short": "9:16", "long": "16:9", "square": "1:1"}
VISUALS_DEFAULTS = {"model": "nano_banana_2_lite", "max_credits": 25}
NO_TEXT = "No text, no letters, no logos, no watermarks."
DEFAULT_COMPOSITION = "Leave the top third calm and fairly empty (sky, wall or negative space) so overlaid text stays readable."

def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))

def save(p, data):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:50] or "video"

def words(text):
    return re.findall(r"\S+", text or "")

def audio_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        raise RuntimeError(f"ffprobe could not read {path}: {out.stderr}")


# ---- visuals (03_visuals) -------------------------------------------------
def _sha(*parts):
    return hashlib.sha1(json.dumps(parts, sort_keys=True).encode()).hexdigest()[:12]

def plan_visuals(proj, cfg=None):
    """Ordered list of images the project needs: characters first, then one per scene with a `visual`.
    Each item: key, file (relative to 03_visuals), prompt, refs (character item keys), hash.
    The hash covers model, aspect, prompt and the hashes of referenced characters, so editing a
    character or a scene prompt marks exactly the affected images stale."""
    proj = Path(proj); cfg = cfg or load(proj / "project.json")
    vcfg = {**VISUALS_DEFAULTS, **cfg.get("visuals", {})}
    aspect = ASPECT[cfg["format"]]
    ad_p = proj / "02_script/art_direction.json"
    art = load(ad_p) if ad_p.exists() else {}
    style = art.get("style", "").strip().rstrip(".")
    chars = {c["id"]: c for c in art.get("characters", [])}
    items = {}
    for cid, c in chars.items():
        prompt = (f"{style}. Character reference sheet of {c['name']}: {c['description']}. "
                  f"Full body, neutral standing pose, centered, plain flat background. {NO_TEXT}")
        items[f"char:{cid}"] = {"key": f"char:{cid}", "file": f"characters/{cid}.png", "prompt": prompt, "refs": [],
                                "hash": _sha(vcfg["model"], aspect, prompt), "kind": "character"}
    sp = proj / "02_script/script.json"
    scenes = load(sp)["scenes"] if sp.exists() else []
    for sc in scenes:
        v = sc.get("visual")
        if not v or not v.get("prompt"): continue
        refs = [f"char:{c}" for c in v.get("characters", []) if f"char:{c}" in items]
        who = "; ".join(f"{chars[r[5:]]['name']} ({chars[r[5:]]['description']})" for r in refs)
        parts = [style + ".", v["prompt"].strip().rstrip(".") + "."]
        if v.get("shot"): parts.append(f"Shot: {v['shot']}.")
        if who: parts.append(f"Characters must match the reference images exactly: {who}.")
        parts += [art.get("composition", DEFAULT_COMPOSITION), NO_TEXT]
        prompt = " ".join(parts)
        items[sc["id"]] = {"key": sc["id"], "file": f"{sc['id']}.png", "prompt": prompt, "refs": refs, "kind": "scene",
                           "hash": _sha(vcfg["model"], aspect, prompt, [items[r]["hash"] for r in refs])}
    return {"items": list(items.values()), "model": vcfg["model"], "aspect": aspect, "max_credits": vcfg["max_credits"]}

def visuals_state(proj, cfg=None):
    """(plan, manifest, missing, stale) where missing = never generated, stale = prompt/refs changed since."""
    proj = Path(proj); plan = plan_visuals(proj, cfg)
    mp = proj / "03_visuals/manifest.json"
    man = load(mp) if mp.exists() else {"items": {}}
    missing, stale = [], []
    for it in plan["items"]:
        rec = man["items"].get(it["key"])
        if not rec or not (proj / "03_visuals" / it["file"]).exists(): missing.append(it["key"])
        elif rec["hash"] != it["hash"]: stale.append(it["key"])
    return plan, man, missing, stale
