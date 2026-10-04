# Stage 2 — Script

Write `02_script/script.json`. Each scene = one narration beat + one visual. One idea per scene, 6–14 words of narration for Shorts (10–14 scenes, 3–5 s each; long: 20–60 scenes). **Read `references/creative.md` first** — it covers story, pacing, shots, art direction and visuals.

## Scene types the template renders
| type | on_screen fields | use for |
|---|---|---|
| `title` | `title`, `subtitle?` | hook / opening card |
| `kinetic` | `text` (≤ 12 words; wrap key words in *asterisks* to highlight) | punchy statements |
| `bullets` | `heading`, `items` (2–4 short strings) | lists, steps |
| `stat` | `value` (number), `prefix?`, `suffix?`, `decimals?`, `label` | numbers that count up |
| `quote` | `text`, `author` | quotes (verify them!) |
| `outro` | `text`, `cta?` | ending / call to action |
| `broll` | `text?` (2–3 word label) | pure picture beat; the image does the work |
| `diagram` | `labels` (3: top, bottom-left, bottom-right), `highlight?` (indices; 2 = lit edge, 3 = filled), `caption?`, `heading?` | concept maps such as a triangle model |

Add new types only together with a matching component (see motion.md).

## Schema
```json
{
  "title": "Why the Moon Is Drifting Away",
  "scenes": [
    {"id": "s01", "type": "title", "narration": "The Moon is leaving us, about four centimetres every year.",
     "on_screen": {"title": "The Moon Is Leaving", "subtitle": "slowly"}},
    {"id": "s02", "type": "stat", "narration": "...", "on_screen": {"value": 3.8, "decimals": 1, "suffix": " cm", "label": "per year"}}
  ]
}
```
- Optional per scene: `"visual": {"prompt", "characters": [ids], "shot", "motion"}` (see creative.md); images are made by `generate_visuals.py` into `03_visuals/` and shown behind the scene's text.
- ids `s01`, `s02`… in order. `narration` is exactly what the voice says; spell numbers the way they should be spoken.
- Scene 1 narration = the hook from idea.json. Last scene = payoff + optional CTA.
- Also write `script.md`: a readable scene / narration / visual table for the user to review.
