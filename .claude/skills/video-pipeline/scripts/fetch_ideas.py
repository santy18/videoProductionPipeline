#!/usr/bin/env python3
"""Keyless idea signals from Hacker News (Algolia) and Reddit search. Prints JSON."""
import argparse, json, requests
ap = argparse.ArgumentParser()
ap.add_argument("--niche", required=True)
ap.add_argument("--limit", type=int, default=10)
a = ap.parse_args()
H = {"User-Agent": "video-pipeline/1.0"}
out = []
try:
    r = requests.get("https://hn.algolia.com/api/v1/search", params={"query": a.niche, "tags": "story", "hitsPerPage": a.limit}, headers=H, timeout=15).json()
    out += [{"source": "hackernews", "title": h.get("title"), "url": h.get("url") or f"https://news.ycombinator.com/item?id={h['objectID']}", "points": h.get("points")} for h in r.get("hits", [])]
except Exception as e:
    out.append({"source": "hackernews", "error": str(e)})
try:
    r = requests.get("https://www.reddit.com/search.json", params={"q": a.niche, "sort": "top", "t": "week", "limit": a.limit}, headers=H, timeout=15).json()
    out += [{"source": "reddit/" + c["data"]["subreddit"], "title": c["data"]["title"], "url": "https://reddit.com" + c["data"]["permalink"], "points": c["data"]["score"]} for c in r["data"]["children"]]
except Exception as e:
    out.append({"source": "reddit", "error": str(e)})
print(json.dumps(out, indent=2, ensure_ascii=False))
