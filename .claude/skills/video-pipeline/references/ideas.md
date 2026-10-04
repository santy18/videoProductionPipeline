# Stage 1 — Ideas

Goal: one strong, specific idea that fits the format (Short ≈ 50 s, max 60 s, long ≈ 3–8 min).

1. Get raw signals
   - Preferred: web_search for "<niche> news this week", "<niche> surprising fact", trending questions.
   - Keyless fallback: `python3 scripts/fetch_ideas.py --niche "space" --limit 15` → JSON headlines from Hacker News + Reddit.
   - Or the user's own list.
2. Turn each signal into an angle: a hook question, a counter-intuitive claim, or "X explained in 60 seconds". Topics aren't ideas; angles are.
3. Score 1–5 on: hook strength, visualisable (can text/numbers/shapes show it?), accuracy risk (lower is better), timeliness.
4. Write `01_idea/idea.json`:
```json
{
  "chosen": {"title": "...", "angle": "...", "hook": "first sentence viewers hear", "audience": "...", "sources": ["url"]},
  "alternatives": [{"title": "...", "angle": "...", "score": 14}],
  "created": "YYYY-MM-DD"
}
```
Verify every factual claim you'll use against a source and record URLs in `sources`.
