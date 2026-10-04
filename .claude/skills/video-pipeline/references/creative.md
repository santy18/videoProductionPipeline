# Stage 2b — Creative direction (read before writing the script)

A video is boring when every scene looks the same and nothing *happens*. The script stage therefore produces three
things together: the **script**, an **art direction** file, and a **visual** for every scene. The user approves all
three in one pause.

## 1. Story first
- One viewer, one feeling. Decide the emotional promise ("you'll recognise your own relationship") before the facts.
- Give the video a **mini-story with 1–2 characters** who live the concept (e.g. a couple moving through the types of
  love). The explanation rides on what happens to them. No story, no characters → use a strong central metaphor instead.
- Open with the hook in scene 1 (a question, a surprising claim, or an image that needs explaining). Never open with
  "In this video…". Close by paying off the hook, then a one-line CTA.
- Facts stay sourced (see ideas.md). Creative framing may dramatise; it must never invent attributions or statistics.

## 2. Pacing
- Short: **target ≈ 50 s, hard max 60 s** (anything from ~45 to 60 s is acceptable; don't spend effort trimming it). **10–14 scenes of 3–5 s**. The picture must change at least every ~3–4 s.
- Narration per scene: **6–14 words** (one beat). Vary rhythm: short punchy scene, then a longer one.
- Alternate scene *kinds* so no two neighbours feel alike: character shot → diagram/stat → b-roll → kinetic text.
- Use a pattern interrupt around the middle (a stat, a diagram, a sudden close-up) to re-grab attention.
- The Qwen voice speaks ≈ 2 words/s. Budget: 50 s ≈ 90–100 words (up to ~115 words is still under 60 s).

## 3. Shots (variety is what reads as "directed")
Rotate `shot`: establishing wide · medium two-shot · over-the-shoulder · close-up on hands/face · detail/object
insert (a coffee cup, a phone, a clock) · symbolic/metaphor image · high-angle · silhouette. Avoid 3 identical framings in a row.
`motion` per scene (camera move on the still): `push-in` for emotional/important beats, `pull-out` to reveal or
release, `pan-left/right` for establishing or comparison, `drift` for calm. Alternate; don't repeat the same twice in a row.

## 4. art_direction.json
Write `02_script/art_direction.json` once per video; every image inherits it so the video looks like one world.
```json
{
  "style": "Flat vector editorial illustration, bold simple shapes, soft paper grain, limited palette of deep navy, warm amber and coral, gentle lighting",
  "composition": "Vertical 9:16. Keep the top third calm and mostly empty (sky/wall/negative space) for overlaid text; subjects in the lower two thirds.",
  "characters": [
    {"id": "mia", "name": "Mia", "description": "woman in her late 20s, black hair in a ponytail, coral sweater, navy trousers, warm round face"},
    {"id": "leo", "name": "Leo", "description": "man in his late 20s, short brown hair, mustard t-shirt under a navy jacket"}
  ],
  "motifs": ["string lights", "city at dusk", "two coffee cups"]
}
```
Rules:
- **Style line is identical for every image** (it's prepended automatically). Pick one look per video and stay in it;
  flat/graphic styles keep characters consistent and hide AI artefacts. Match the palette to `project.json → style`.
- Characters are described by **visible, concrete traits** (hair, clothes, colours, age) — the same words every time.
  Max 2–3 characters; each gets a reference sheet that is passed to every scene they appear in.
- No text, logos, brand names or real people's likenesses in prompts.
- `composition` is appended to every prompt; keep the top third free so text scenes stay readable.

## 5. Scene `visual` blocks
```json
"visual": {"prompt": "Mia and Leo share a rooftop at dusk, her head on his shoulder", "characters": ["mia", "leo"],
           "shot": "medium two-shot, slightly low angle", "motion": "push-in"}
```
- `prompt` describes **what is in the frame and the mood**, not the style (style comes from art_direction).
- List `characters` that appear so their reference sheets are attached. Omit for pure object/metaphor shots.
- Scenes with no `visual` fall back to the animated glow background (use for stat/diagram scenes when the graphic is the star).
- **Budget:** each image costs ~1 credit (`nano_banana_2_lite`); character sheets cost 1 each. Aim for ≤ 20 credits per
  video. Reuse a generated image for a second scene by repeating nothing — instead vary `motion` on adjacent scenes
  that share a location, or use a text/diagram scene. Run `generate_visuals.py --dry-run` and read the estimate first.

## 6. Text over picture
Text scenes (`title`, `kinetic`, `bullets`, `stat`, `quote`, `outro`) render **on top of** the image, anchored in the top
zone with a shadow. Keep on-screen text short (≤ 8 words for kinetic) because the image is the star. Use `broll`
(no text, or a 2–3 word label) for pure picture beats, and `diagram` for concept maps (e.g. a triangle with 3 labels).

## 7. Checklist before asking for approval
- [ ] Hook in scene 1; payoff in the last scene; CTA only once.
- [ ] 10–14 scenes, none longer than ~6 s; no two adjacent scenes with the same shot or type.
- [ ] Every claim has a source in idea.json.
- [ ] art_direction.json written; each scene has a `visual` (or a deliberate reason not to).
- [ ] `generate_visuals.py --dry-run` estimate ≤ budget; show it to the user.
