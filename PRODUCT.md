# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Vite + React + TypeScript frontend, in `viewer/` at the repo root. A small Node server serves `projects/`, streams mp4/wav with Range support, and writes JSON edits back to disk. Chosen by the user.

## Users
One operator (the channel owner), working locally between pipeline runs. They run the whole faceless-video pipeline (idea, script, timesheet, visuals, voice, render) and need to inspect each stage, listen and watch the output, and correct it. Possibly shared later; not at first.

## Product Purpose
Studio Viewer is a file-based review and edit surface for the video pipeline's `projects/<slug>/` folders. It lets the operator see a whole video's production on one screen (scene text, visuals, voice clips, timing, final render), edit the stage JSON files, and later send regenerate commands to a Claude session. Success: going from "how did this come out?" to "fixed that line" without a terminal or Finder.

## Positioning
Unlike a generic file browser or JSON editor, it understands the pipeline: stage folders, scene ids that link script, image, wav and timesheet, and a vertical 1080x1920 render as the central object.

## Operating Context
- Projects live in `projects/<slug>/` with `01_idea` to `06_render`. Files: `project.json`, `idea.json`, `script.json`, `art_direction.json`, `timesheet.json`, voice and visuals `manifest.json`, per-scene `sNN.wav` and `sNN.png`, `captions.srt`, `script.md`, `raw.mp4`, `final.mp4`.
- Scale today: 2 projects of ~600-700 MB, 8-11 scenes, ~46 s, vertical 9:16.
- The timesheet is derived data: never hand-edited, fixes happen upstream in `script.json`.
- `05_motion/` is code and `node_modules`; the viewer must not touch it. API keys and `.env` are never read or written.

## Capabilities and Constraints
- Server serves and writes under `projects/`, auto-discovers projects, supports Range for mp4/wav.
- Schema-aware forms for project, idea, script, art direction; raw-JSON toggle with validation for any other JSON; explicit save with diff and undo; timesheet read-only.
- Players: mp4 with scene jump points, wav per scene.
- Planned, not yet built: "Regenerate" actions that send commands to a Claude session (mechanism undecided: a watched queue file or a copyable prompt).
- Write endpoints should stay separable so it could later be hosted read-only (shareable later).

## Evidence on Hand
Two real projects in `projects/` (sternberg-s-love-triangle, sternberg-s-triangular-theory-of-love) with all stages populated. No brand identity for the tool itself exists yet; the channel's navy/amber look belongs to the videos, not necessarily the tool.

## Product Principles
- The video is the focal object; the interface serves it.
- Scenes are the unit: every view links script, visual, voice and timing by scene id.
- Edits are explicit, reversible and upstream: never silently overwrite, never hand-edit derived files.
- Show real files honestly, including missing, empty and changed-on-disk states.
- Reading comes first; editing is a deliberate step.
