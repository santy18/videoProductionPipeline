#!/usr/bin/env python3
"""Generate illustrated b-roll into 03_visuals/ with the Higgsfield CLI.

Characters (from 02_script/art_direction.json) are generated first as reference sheets, then one image per
scene that has a `visual` block, passing the character sheets as image references for consistency.
Only missing or stale images (prompt/character changed) are generated, so re-runs cost nothing.
  --dry-run   print what would be generated and the credit estimate, spend nothing
  --only a,b  limit to scene ids / character ids (e.g. s03,mia); stale or missing only unless --force
  --force     regenerate the selected items even if up to date
"""
import argparse, json, re, subprocess, sys, threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import load, plan_visuals, save, visuals_state

ap = argparse.ArgumentParser()
ap.add_argument("project")
ap.add_argument("--dry-run", action="store_true")
ap.add_argument("--only", help="comma-separated scene ids and/or character ids")
ap.add_argument("--force", action="store_true")
ap.add_argument("--max-credits", type=float, help="override visuals.max_credits from project.json")
ap.add_argument("--workers", type=int, default=3)
a = ap.parse_args()
proj = Path(a.project); out = proj / "03_visuals"; out.mkdir(exist_ok=True)
cfg = load(proj / "project.json")

plan, man, missing, stale = visuals_state(proj, cfg)
items = {it["key"]: it for it in plan["items"]}
if not items:
    sys.exit("nothing to generate: add scenes with a `visual` block (and art_direction.json) first")

if a.only:
    want = set()
    for k in a.only.split(","):
        k = k.strip(); key = k if k in items else f"char:{k}"
        if key not in items: sys.exit(f"unknown item '{k}'; choose from {', '.join(items)}")
        want.add(key)
else:
    want = set(items)
todo = [k for k in items if k in want and (a.force or k in missing or k in stale)]
# a regenerated character invalidates scenes that use it
if not a.only:
    todo += [k for k in items if k not in todo and any(r in todo for r in items[k]["refs"])]
todo.sort(key=lambda k: list(items).index(k))


def hf(*args):
    return subprocess.run(["higgsfield", *args], capture_output=True, text=True)

def credits_each():
    sample = next(iter(items.values()))["prompt"]
    r = hf("generate", "cost", plan["model"], "--prompt", sample, "--aspect_ratio", plan["aspect"])
    m = re.search(r"([\d.]+)\s*credit", r.stdout)
    if r.returncode or not m: sys.exit(f"could not get cost from higgsfield: {r.stderr.strip() or r.stdout.strip()}")
    return float(m.group(1))

def balance():
    m = re.search(r"([\d.]+)\s*credits", hf("account", "status").stdout)
    return float(m.group(1)) if m else None

each = credits_each(); est = each * len(todo); cap = a.max_credits or plan["max_credits"]
print(f"model {plan['model']}  aspect {plan['aspect']}  {each:g} credit(s)/image")
print(f"up to date: {len(items) - len(todo)}   to generate: {len(todo)} -> ~{est:g} credits (cap {cap:g}, balance {balance()})")
for k in todo:
    why = "forced" if a.force else "missing" if k in missing else "stale" if k in stale else "uses regenerated character"
    print(f"  {k:<14} {why}")
if a.dry_run or not todo:
    sys.exit(0)
if est > cap:
    sys.exit(f"estimate {est:g} exceeds cap {cap:g}; raise visuals.max_credits in project.json or pass --max-credits")

lock = threading.Lock()

def save_manifest():
    save(out / "manifest.json", man)

def generate(key):
    it = items[key]; dst = out / it["file"]; dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["generate", "create", plan["model"], "--prompt", it["prompt"], "--aspect_ratio", plan["aspect"]]
    for r in it["refs"]:
        cmd += ["--image-references", str(out / items[r]["file"])]
    cmd += ["--wait", "--wait-timeout", "10m", "--json"]
    r = hf(*cmd)
    if r.returncode: raise RuntimeError((r.stderr or r.stdout).strip()[:400])
    txt = r.stdout[min([i for i in (r.stdout.find("["), r.stdout.find("{")) if i >= 0], default=0):]
    data, _ = json.JSONDecoder().raw_decode(txt)
    job = data[0] if isinstance(data, list) else data
    if job.get("status") != "completed" or not job.get("result_url"):
        raise RuntimeError(f"job {job.get('id')} ended '{job.get('status')}'")
    import requests
    img = requests.get(job["result_url"], timeout=120); img.raise_for_status()
    dst.write_bytes(img.content)
    with lock:
        man["items"][key] = {"hash": it["hash"], "file": it["file"], "job_id": job.get("id"), "model": plan["model"]}
        save_manifest()
    print(f"ok  {key}")

failed = {}
def run(keys):
    with ThreadPoolExecutor(max_workers=max(1, a.workers)) as ex:
        futs = {k: ex.submit(generate, k) for k in keys}
        for k, f in futs.items():
            try: f.result()
            except Exception as e:
                failed[k] = str(e); print(f"FAIL {k}: {e}", file=sys.stderr)

chars = [k for k in todo if items[k]["kind"] == "character"]
run(chars)
# scenes whose character sheet failed would be generated without it; skip them instead
scenes = [k for k in todo if items[k]["kind"] == "scene" and not any(r in failed for r in items[k]["refs"])]
for k in todo:
    if k not in chars and k not in scenes: failed.setdefault(k, "skipped: character sheet failed")
run(scenes)
print(f"balance now {balance()}")
if failed:
    sys.exit(f"{len(failed)} failed: {', '.join(failed)}  (re-run to retry only those)")
print("visuals done -> now run setup_motion.py / render.sh")
