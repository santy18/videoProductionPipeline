// Shared document store: one draft per (project, file), with undo, dirty tracking and disk-change polling.
import { useSyncExternalStore } from 'react'
import { api } from './api'

export interface Doc {
  key: string; slug: string; path: string
  status: 'loading' | 'ready' | 'error'
  error?: string
  disk: string            // text on disk when last loaded/saved
  draft: string           // text being edited
  mtime: number
  history: string[]       // previous drafts for undo
  future: string[]
  saving: boolean
  conflict: boolean       // disk changed while there are unsaved edits
  saveError?: string
}

const docs = new Map<string, Doc>()
const subs = new Set<() => void>()
let version = 0
const emit = () => { version++; subs.forEach((s) => s()) }
const keyOf = (slug: string, path: string) => `${slug}::${path}`
const patch = (key: string, p: Partial<Doc>) => { const d = docs.get(key); if (d) { docs.set(key, { ...d, ...p }); emit() } }

export async function loadDoc(slug: string, path: string, force = false) {
  const key = keyOf(slug, path)
  const existing = docs.get(key)
  if (existing && !force && existing.status !== 'error') return
  if (!existing) docs.set(key, { key, slug, path, status: 'loading', disk: '', draft: '', mtime: 0, history: [], future: [], saving: false, conflict: false })
  else patch(key, { status: 'loading' })
  emit()
  try {
    const f = await api.readFile(slug, path)
    docs.set(key, { key, slug, path, status: 'ready', disk: f.text, draft: f.text, mtime: f.mtime, history: [], future: [], saving: false, conflict: false })
  } catch (e) {
    patch(key, { status: 'error', error: (e as Error).message })
  }
  emit()
}

export const getDoc = (slug: string, path: string) => docs.get(keyOf(slug, path))
export const isDirty = (d?: Doc) => !!d && d.status === 'ready' && d.draft !== d.disk
export const dirtyDocs = () => [...docs.values()].filter(isDirty)

export function setDraft(slug: string, path: string, text: string, opts: { coalesce?: boolean } = {}) {
  const key = keyOf(slug, path)
  const d = docs.get(key)
  if (!d || d.draft === text) return
  const history = opts.coalesce && d.history.length ? d.history : [...d.history, d.draft].slice(-100)
  docs.set(key, { ...d, draft: text, history, future: [], saveError: undefined })
  emit()
}
export function undo(slug: string, path: string) {
  const key = keyOf(slug, path); const d = docs.get(key)
  if (!d || !d.history.length) return
  const prev = d.history[d.history.length - 1]
  docs.set(key, { ...d, draft: prev, history: d.history.slice(0, -1), future: [d.draft, ...d.future] }); emit()
}
export function redo(slug: string, path: string) {
  const key = keyOf(slug, path); const d = docs.get(key)
  if (!d || !d.future.length) return
  const [next, ...rest] = d.future
  docs.set(key, { ...d, draft: next, history: [...d.history, d.draft], future: rest }); emit()
}
export function revert(slug: string, path: string) {
  const key = keyOf(slug, path); const d = docs.get(key)
  if (!d) return
  docs.set(key, { ...d, draft: d.disk, history: isDirty(d) ? [...d.history, d.draft] : d.history, future: [], conflict: false, saveError: undefined }); emit()
}
export async function save(slug: string, path: string) {
  const key = keyOf(slug, path); const d = docs.get(key)
  if (!d || !isDirty(d) || d.saving) return false
  patch(key, { saving: true, saveError: undefined })
  try {
    const r = await api.writeFile(slug, path, d.draft, d.mtime)
    const cur = docs.get(key)!
    docs.set(key, { ...cur, disk: d.draft, mtime: r.mtime, saving: false, conflict: false }); emit()
    return true
  } catch (e) {
    const err = e as Error & { status?: number }
    patch(key, { saving: false, saveError: err.message, conflict: err.status === 409 || docs.get(key)!.conflict })
    return false
  }
}
/** Replace edits with the current disk version. */
export const reload = (slug: string, path: string) => loadDoc(slug, path, true)

/** Keep my edits and overwrite disk on next save by adopting the new mtime. */
export async function keepMine(slug: string, path: string) {
  const key = keyOf(slug, path)
  try {
    const f = await api.readFile(slug, path)
    patch(key, { mtime: f.mtime, disk: f.text, conflict: false, saveError: undefined })
  } catch { /* ignore */ }
}

let pollTimer: number | undefined
export function startPolling() {
  if (pollTimer) return
  pollTimer = window.setInterval(async () => {
    const bySlug = new Map<string, Doc[]>()
    for (const d of docs.values()) if (d.status === 'ready') bySlug.set(d.slug, [...(bySlug.get(d.slug) ?? []), d])
    for (const [slug, list] of bySlug) {
      try {
        const stat = await api.stat(slug, list.map((d) => d.path))
        for (const d of list) {
          const m = stat[d.path]
          if (m && Math.abs(m - d.mtime) > 1) {
            if (isDirty(d)) { if (!d.conflict) patch(d.key, { conflict: true }) } else loadDoc(slug, d.path, true)
          }
        }
      } catch { /* server offline: ignore */ }
    }
  }, 3000)
}

export function useDoc(slug: string, path: string | null): Doc | undefined {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb) } },
    () => { void version; return path ? docs.get(keyOf(slug, path)) : undefined },
  )
}
export function useDirtyCount() {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb) } },
    () => version,
  )
}

export function parseJson<T>(text: string): { ok: true; value: T } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(text) as T } } catch (e) { return { ok: false, error: (e as Error).message } }
}
export const stringify = (v: unknown) => JSON.stringify(v, null, 2) + '\n'
