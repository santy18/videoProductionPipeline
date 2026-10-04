# Studio Viewer

A local viewer and editor for `projects/`: scene review, video and voice playback, and schema-aware JSON editing.

```
cd viewer
npm install        # first time
npm run dev        # http://127.0.0.1:5173  (Vite + API in one process)
npm start          # build once, serve dist/
```

- `VIEWER_READONLY=1` disables every write. `PORT`, `HOST` and `VIEWER_ROOT` override defaults.
- Writes are limited to `.json`, `.md`, `.srt`, `.txt` inside a project, never `05_motion/`, never `.env`.
- Saves check the file's mtime; if a pipeline run changed it meanwhile you get a conflict prompt.
- The timesheet is shown read-only: fix problems in `script.json`, then re-run the stage.
- "Regenerate" is a reserved, disabled control. `POST /api/queue` already appends to `viewer-queue.jsonl` for a future Claude consumer.
- Thumbnails use `sips`, posters use `ffmpeg` (macOS); both fall back gracefully.
