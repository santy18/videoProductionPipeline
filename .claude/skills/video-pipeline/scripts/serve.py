#!/usr/bin/env python3
"""Serve finished videos to a phone on the local network.
Lists every project that has 06_render/final.mp4 with a player, the caption (07_publish/description.md) and downloads.
Binds 0.0.0.0 (anyone on your Wi-Fi can open it; there is no login), serves only media/text under projects/,
and supports HTTP range requests (iPhone Safari needs them to play mp4).
  python3 serve.py [--port 8080] [--root projects]"""
import argparse, html, mimetypes, os, re, socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, default=8080)
ap.add_argument("--root", default="projects")
a = ap.parse_args()
ROOT = Path(a.root).resolve()
ALLOWED = {".mp4", ".srt", ".md", ".png", ".jpg", ".wav", ".mp3"}
SKIP = {"node_modules", ".cache"}


def index():
    cards = []
    for p in sorted(ROOT.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        v = p / "06_render/final.mp4"
        if not v.exists():
            continue
        d = p / "07_publish/description.md"
        cap = html.escape(d.read_text(encoding="utf-8")) if d.exists() else "(no description yet)"
        s = p / "06_render/captions.srt"
        links = f'<a href="/{p.name}/06_render/final.mp4" download>Download video</a>' + (
            f' · <a href="/{p.name}/06_render/captions.srt" download>Captions (.srt)</a>' if s.exists() else "")
        cards.append(f'<section><h2>{html.escape(p.name)}</h2>'
                     f'<video controls playsinline preload="metadata" src="/{p.name}/06_render/final.mp4"></video>'
                     f'<p>{links}</p><pre>{cap}</pre>'
                     f'<button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent)">Copy caption</button></section>')
    return ("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
            "<title>Videos</title><style>body{font:16px system-ui;background:#0b0f1a;color:#f5f7ff;margin:0;padding:16px}"
            "section{max-width:520px;margin:0 auto 32px}video{width:100%;border-radius:12px;background:#000}"
            "pre{white-space:pre-wrap;background:#151b2e;padding:12px;border-radius:10px}a{color:#ffcc33}"
            "button{background:#ffcc33;border:0;border-radius:999px;padding:10px 18px;font-weight:700}</style>"
            "<h1>Videos</h1>" + ("".join(cards) or "<p>No finished videos yet.</p>")).encode()


class H(BaseHTTPRequestHandler):
    def log_message(self, *x): pass

    def do_GET(self):
        path = unquote(self.path.split("?")[0])
        if path in ("/", "/index.html"):
            b = index(); self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        f = (ROOT / path.lstrip("/")).resolve()
        if (ROOT not in f.parents or f.suffix.lower() not in ALLOWED or not f.is_file()
                or any(part in SKIP for part in f.parts)):
            self.send_error(404); return
        size = f.stat().st_size; start, end, code = 0, size - 1, 200
        m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if m and (m.group(1) or m.group(2)):
            if m.group(1): start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else size - 1
            else: start = max(0, size - int(m.group(2)))
            end = min(end, size - 1); code = 206
            if start > end: self.send_error(416); return
        self.send_response(code)
        self.send_header("Content-Type", mimetypes.guess_type(f.name)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes"); self.send_header("Content-Length", str(end - start + 1))
        if code == 206: self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        try:
            with open(f, "rb") as fh:
                fh.seek(start); left = end - start + 1
                while left > 0:
                    chunk = fh.read(min(1 << 20, left))
                    if not chunk: break
                    self.wfile.write(chunk); left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try: s.connect(("10.255.255.255", 1)); return s.getsockname()[0]
    except OSError: return "localhost"
    finally: s.close()


print(f"serving {ROOT} on 0.0.0.0:{a.port}  ->  open http://{lan_ip()}:{a.port} on your phone (same Wi-Fi). Ctrl+C to stop.", flush=True)
ThreadingHTTPServer(("0.0.0.0", a.port), H).serve_forever()
