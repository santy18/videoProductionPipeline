# Stage 5 — Motion (Remotion)

Template layout (`05_motion/`):
```
src/index.ts        registerRoot
src/Root.tsx        <Composition id="Main"> sized from timesheet.json via calculateMetadata
src/Video.tsx       timesheet scenes → <Sequence> + <Audio> + scene component; captions + music on top
src/theme.ts        colours, font, safe margins — change the look here first
src/scenes/*.tsx    Title, Kinetic, Bullets, Stat, Quote, Outro, Captions, Background
src/timesheet.json  copied in by setup_motion.py (don't hand-edit)
public/voice/*      scene audio; public/music.mp3 optional
```
Preview: `cd 05_motion && npm i && npx remotion studio`.

## Adding a scene type
1. Create `src/scenes/MyScene.tsx` exporting a component taking `{data, durationInFrames}`; animate with `useCurrentFrame()`, `spring`, `interpolate`.
2. Register it in the `SCENES` map in `Video.tsx`.
3. Document its `on_screen` fields in references/script.md so the script stage can use it.

## Guidelines
- Elements enter within the first ~15 frames; the wrapper in `Video.tsx` fades each scene in/out.
- Keep text inside `theme.safe` margins (Shorts UI covers the bottom ~20%).
- Drop-in libraries (install the exact same version as `remotion`): `@remotion/google-fonts`, `@remotion/shapes`, `@remotion/lottie`, `@remotion/three`, `@remotion/transitions`, `@remotion/paths`, `@remotion/noise`.
- Images/stock: put files in `public/` and use `staticFile()`; never hotlink.
