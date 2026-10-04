// Studio Viewer server: serves projects/, streams media with Range, writes text edits back.
// No runtime dependencies. `node server.js --dev` mounts Vite; otherwise serves dist/.
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(process.env.VIEWER_ROOT || path.join(HERE, '..', 'projects'))
const PORT = Number(process.env.PORT || 5173)
const HOST = process.env.HOST || '0.0.0.0'
const REMOTE_WRITES = process.env.VIEWER_ALLOW_REMOTE_WRITES === '1'
const READONLY = process.env.VIEWER_READONLY === '1'
const DEV = process.argv.includes('--dev')
const CACHE = path.join(os.tmpdir(), 'studio-viewer-cache')
const QUEUE = path.resolve(HERE, '..', 'viewer-queue.jsonl')

const HIDDEN = new Set(['node_modules', '.DS_Store', '.git', '__pycache__'])
const WRITABLE_EXT = new Set(['.json', '.md', '.srt', '.txt'])
const BLOCKED_WRITE = ['05_motion']
const MIME = {
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.srt': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.ts': 'text/plain; charset=utf-8', '.tsx': 'text/plain; charset=utf-8',
  '.js': 'text/plain; charset=utf-8', '.css': 'text/plain; charset=utf-8', '.html': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml',
}
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'

const send = (res, code, body, headers = {}) => {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body)
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(isObj ? JSON.stringify(body) : body)
}

/** Resolve slug + relative path to an absolute path that stays inside the project. */
function resolveIn(slug, rel = '') {
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.startsWith('.')) return null
  const base = path.join(ROOT, slug)
  const abs = path.resolve(base, rel)
  if (abs !== base && !abs.startsWith(base + path.sep)) return null
  const parts = path.relative(base, abs).split(path.sep)
  if (parts.some((p) => p === 'node_modules' || p === '.env' || p.startsWith('.env'))) return null
  return abs
}

async function exists(p) { try { await fsp.access(p); return true } catch { return false } }
async function readJson(p) { try { return JSON.parse(await fsp.readFile(p, 'utf8')) } catch { return null } }

async function dirSize(dir) {
  let total = 0
  const walk = async (d) => {
    let ents
    try { ents = await fsp.readdir(d, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      if (HIDDEN.has(e.name)) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) await walk(p)
      else { try { total += (await fsp.stat(p)).size } catch { /* ignore */ } }
    }
  }
  await walk(dir)
  return total
}

async function listDir(dir) {
  const out = []
  let ents
  try { ents = await fsp.readdir(dir, { withFileTypes: true }) } catch { return out }
  ents.sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))
  for (const e of ents) {
    if (HIDDEN.has(e.name) || e.name.startsWith('.env')) continue
    const p = path.join(dir, e.name)
    const st = await fsp.stat(p)
    out.push({ name: e.name, dir: e.isDirectory(), size: st.size, mtime: st.mtimeMs })
  }
  return out
}

async function walkTree(base, rel = '') {
  const items = await listDir(path.join(base, rel))
  const out = []
  for (const it of items) {
    const r = rel ? `${rel}/${it.name}` : it.name
    if (it.dir) {
      // source folders are shown, but node_modules is hidden and 05_motion stays shallow
      out.push({ ...it, path: r, children: await walkTree(base, r) })
    } else out.push({ ...it, path: r })
  }
  return out
}

async function projectSummary(slug) {
  const base = path.join(ROOT, slug)
  const project = await readJson(path.join(base, 'project.json'))
  const script = await readJson(path.join(base, '02_script', 'script.json'))
  const idea = await readJson(path.join(base, '01_idea', 'idea.json'))
  const sheet = await readJson(path.join(base, '03_timesheet', 'timesheet.json'))
  const sceneCount = script?.scenes?.length ?? 0
  const wavs = (await listDir(path.join(base, '04_voice'))).filter((f) => f.name.endsWith('.wav')).length
  const visuals = (await listDir(path.join(base, '03_visuals'))).filter((f) => /^s\d+\.(png|jpg)$/.test(f.name)).length
  const hasFinal = await exists(path.join(base, '06_render', 'final.mp4'))
  const hasRaw = await exists(path.join(base, '06_render', 'raw.mp4'))
  const hasMotion = await exists(path.join(base, '05_motion', 'src', 'Video.tsx'))
  const st = (done, partial) => (done ? 'done' : partial ? 'partial' : 'missing')
  const stages = [
    { id: '01_idea', label: 'Idea', state: st(!!idea?.chosen) },
    { id: '02_script', label: 'Script', state: st(sceneCount > 0) },
    { id: '03_timesheet', label: 'Timesheet', state: st(sheet?.status === 'synced' || (sheet && sheet.scenes?.length), !!sheet) },
    { id: '04_voice', label: 'Voice', state: st(sceneCount > 0 && wavs >= sceneCount, wavs > 0), detail: `${wavs}/${sceneCount}` },
    { id: '05_motion', label: 'Motion', state: st(hasMotion && (hasFinal || hasRaw), hasMotion) },
    { id: '06_render', label: 'Render', state: st(hasFinal, hasRaw) },
  ]
  const stat = await fsp.stat(base)
  return {
    slug,
    title: project?.title || script?.title || idea?.chosen?.title || slug,
    format: project?.format || null,
    width: project?.width ?? sheet?.width ?? null,
    height: project?.height ?? sheet?.height ?? null,
    duration: sheet?.total_sec ?? null,
    sceneCount,
    visualCount: visuals,
    hasFinal,
    stages,
    size: await dirSize(base),
    mtime: stat.mtimeMs,
    hook: idea?.chosen?.hook || null,
  }
}

async function ensureCache() { await fsp.mkdir(CACHE, { recursive: true }) }

function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'ignore' })
    p.on('error', () => resolve(false))
    p.on('close', (c) => resolve(c === 0))
  })
}

async function serveCached(req, res, key, make, mime) {
  await ensureCache()
  const f = path.join(CACHE, key)
  if (!(await exists(f))) {
    const ok = await make(f)
    if (!ok) return false
  }
  const buf = await fsp.readFile(f)
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600', 'Content-Length': buf.length })
  res.end(buf)
  return true
}

function streamFile(req, res, abs, stat, extra = {}) {
  const type = mimeOf(abs)
  const range = req.headers.range
  const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'Last-Modified': new Date(stat.mtimeMs).toUTCString(), ...extra }
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    let start = m && m[1] ? parseInt(m[1], 10) : 0
    let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1
    if (m && !m[1] && m[2]) { start = Math.max(0, stat.size - parseInt(m[2], 10)); end = stat.size - 1 }
    if (start >= stat.size || end >= stat.size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` })
      return res.end()
    }
    res.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 })
    fs.createReadStream(abs, { start, end }).on('error', () => res.destroy()).pipe(res)
  } else {
    res.writeHead(200, { ...base, 'Content-Length': stat.size })
    fs.createReadStream(abs).on('error', () => res.destroy()).pipe(res)
  }
}

function readBody(req, limit = 5_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('Body too large')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const isLoopback = (a = '') => a === '::1' || a === '127.0.0.1' || a === '::ffff:127.0.0.1'

function sameOrigin(req) {
  // Writes from other machines on the network are refused unless explicitly allowed.
  if (!REMOTE_WRITES && !isLoopback(req.socket.remoteAddress)) return false
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const o = new URL(origin)
    return o.host === req.headers.host
  } catch { return false }
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent) // api, ...
  const q = url.searchParams

  if (parts[1] === 'info') {
    return send(res, 200, { root: ROOT, readonly: READONLY, queue: QUEUE })
  }

  if (parts[1] === 'projects' && parts.length === 2) {
    const names = (await listDir(ROOT)).filter((e) => e.dir && !e.name.startsWith('.')).map((e) => e.name)
    const out = []
    for (const n of names) out.push(await projectSummary(n))
    out.sort((a, b) => b.mtime - a.mtime)
    return send(res, 200, out)
  }

  const slug = parts[2]
  if (parts[1] === 'projects' && slug && parts[3] === 'tree') {
    const base = resolveIn(slug)
    if (!base || !(await exists(base))) return send(res, 404, { error: 'Project not found' })
    return send(res, 200, await walkTree(base))
  }
  if (parts[1] === 'projects' && slug && parts.length === 3) {
    const base = resolveIn(slug)
    if (!base || !(await exists(base))) return send(res, 404, { error: 'Project not found' })
    return send(res, 200, await projectSummary(slug))
  }

  if (parts[1] === 'projects' && slug && parts[3] === 'file') {
    const rel = q.get('path') || ''
    const abs = resolveIn(slug, rel)
    if (!abs) return send(res, 400, { error: 'Bad path' })
    if (req.method === 'GET') {
      let st
      try { st = await fsp.stat(abs) } catch { return send(res, 404, { error: 'File not found' }) }
      if (st.isDirectory()) return send(res, 400, { error: 'Is a directory' })
      if (st.size > 4_000_000) return send(res, 413, { error: 'File too large to edit as text' })
      return send(res, 200, { path: rel, text: await fsp.readFile(abs, 'utf8'), mtime: st.mtimeMs, size: st.size })
    }
    if (req.method === 'PUT') {
      if (READONLY) return send(res, 403, { error: 'Viewer is running read-only' })
      if (!sameOrigin(req) || req.headers['x-viewer'] !== '1') return send(res, 403, { error: 'Cross-origin write refused' })
      const relNorm = path.relative(resolveIn(slug), abs).split(path.sep)
      if (!WRITABLE_EXT.has(path.extname(abs).toLowerCase())) return send(res, 403, { error: 'Only json, md, srt and txt files can be edited' })
      if (BLOCKED_WRITE.includes(relNorm[0])) return send(res, 403, { error: 'Motion code is not editable here; fix the script upstream' })
      const body = JSON.parse(await readBody(req))
      if (typeof body.text !== 'string') return send(res, 400, { error: 'Missing text' })
      if (path.extname(abs).toLowerCase() === '.json') {
        try { JSON.parse(body.text) } catch (e) { return send(res, 400, { error: `Invalid JSON: ${e.message}` }) }
      }
      let cur = null
      try { cur = await fsp.stat(abs) } catch { /* new file */ }
      if (cur && body.baseMtime && Math.abs(cur.mtimeMs - body.baseMtime) > 1) {
        return send(res, 409, { error: 'The file changed on disk since you opened it', mtime: cur.mtimeMs })
      }
      if (!cur) return send(res, 404, { error: 'Cannot create new files from the viewer' })
      const tmp = `${abs}.viewer-tmp`
      await fsp.writeFile(tmp, body.text, 'utf8')
      await fsp.rename(tmp, abs)
      const st = await fsp.stat(abs)
      return send(res, 200, { mtime: st.mtimeMs, size: st.size })
    }
  }

  if (parts[1] === 'projects' && slug && parts[3] === 'stat') {
    const rels = (q.get('paths') || '').split('\n').filter(Boolean)
    const out = {}
    for (const rel of rels) {
      const abs = resolveIn(slug, rel)
      if (!abs) continue
      try { out[rel] = (await fsp.stat(abs)).mtimeMs } catch { out[rel] = null }
    }
    return send(res, 200, out)
  }

  if (parts[1] === 'thumb') {
    const abs = resolveIn(parts[2], q.get('path') || '')
    const w = Math.min(1200, Math.max(48, Number(q.get('w')) || 240))
    if (!abs || !(await exists(abs))) return send(res, 404, 'not found')
    const st = await fsp.stat(abs)
    const key = crypto.createHash('md5').update(`${abs}:${st.mtimeMs}:${w}`).digest('hex') + '.jpg'
    const ok = await serveCached(req, res, key, (out) => run('sips', ['-Z', String(w), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', abs, '--out', out]), 'image/jpeg')
    if (!ok) return streamFile(req, res, abs, st)
    return
  }

  if (parts[1] === 'poster') {
    const mp4 = resolveIn(parts[2], '06_render/final.mp4')
    if (!mp4 || !(await exists(mp4))) return send(res, 404, 'no render')
    const st = await fsp.stat(mp4)
    const t = Number(q.get('t')) || 1
    const w = Math.min(1000, Number(q.get('w')) || 360)
    const key = crypto.createHash('md5').update(`${mp4}:${st.mtimeMs}:${t}:${w}`).digest('hex') + '.jpg'
    const ok = await serveCached(req, res, key, (out) => run('ffmpeg', ['-y', '-v', 'error', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-vf', `scale=${w}:-2`, '-q:v', '4', out]), 'image/jpeg')
    if (!ok) return send(res, 404, 'poster unavailable')
    return
  }

  if (parts[1] === 'queue' && req.method === 'POST') {
    if (READONLY) return send(res, 403, { error: 'Viewer is running read-only' })
    if (!sameOrigin(req) || req.headers['x-viewer'] !== '1') return send(res, 403, { error: 'Cross-origin write refused' })
    const body = JSON.parse(await readBody(req, 50_000))
    const entry = { at: new Date().toISOString(), ...body }
    await fsp.appendFile(QUEUE, JSON.stringify(entry) + '\n')
    return send(res, 200, { queued: true, file: QUEUE })
  }

  return send(res, 404, { error: 'Unknown endpoint' })
}

async function handle(req, res, vite) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url)
    if (url.pathname.startsWith('/files/')) {
      const [, , slug, ...rest] = url.pathname.split('/')
      const abs = resolveIn(decodeURIComponent(slug), decodeURIComponent(rest.join('/')))
      if (!abs) return send(res, 400, 'Bad path')
      let st
      try { st = await fsp.stat(abs) } catch { return send(res, 404, 'Not found') }
      if (st.isDirectory()) return send(res, 400, 'Is a directory')
      const name = path.basename(abs).replace(/[^\w.\- ]/g, '_')
      const slugName = decodeURIComponent(slug)
      const extra = url.searchParams.get('download') === '1'
        ? { 'Content-Disposition': `attachment; filename="${abs.endsWith('final.mp4') ? slugName : slugName + '-' + name.replace(/\.[^.]+$/, '')}${path.extname(abs)}"` }
        : {}
      return streamFile(req, res, abs, st, extra)
    }
    if (vite) return vite.middlewares(req, res, () => send(res, 404, 'Not found'))
    // production: serve dist with SPA fallback
    const dist = path.join(HERE, 'dist')
    let f = path.join(dist, url.pathname === '/' ? 'index.html' : url.pathname)
    if (!f.startsWith(dist) || !(await exists(f)) || (await fsp.stat(f)).isDirectory()) f = path.join(dist, 'index.html')
    if (!(await exists(f))) return send(res, 503, 'Run `npm run build` in viewer/ first (or use `npm run dev`).')
    const st = await fsp.stat(f)
    return streamFile(req, res, f, st)
  } catch (e) {
    console.error(e)
    if (!res.headersSent) send(res, 500, { error: e.message || 'Server error' })
    else res.destroy()
  }
}

let vite = null
if (DEV) {
  const { createServer } = await import('vite')
  vite = await createServer({ root: HERE, server: { middlewareMode: true }, appType: 'spa' })
}

http.createServer((req, res) => handle(req, res, vite)).listen(PORT, HOST, () => {
  console.log(`Studio Viewer  http://127.0.0.1:${PORT}  (${DEV ? 'dev' : 'built'}${READONLY ? ', read-only' : ''})`)
  if (HOST === '0.0.0.0' || HOST === '::') {
    for (const addrs of Object.values(os.networkInterfaces()))
      for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) console.log(`On your network  http://${a.address}:${PORT}  (${REMOTE_WRITES ? 'remote edits allowed' : 'view-only from other devices'})`)
  }
  console.log(`Projects root  ${ROOT}`)
})
