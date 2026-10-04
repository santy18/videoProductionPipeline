import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Segmented, toast, Empty } from './ui'
import { Icon } from './Icon'
import { IdeaForm, JsonNode, ScriptForm } from './forms'
import { collapseDiff, diffLines, cx, extOf } from '../lib/util'
import { loadDoc, parseJson, redo, reload, revert, save, setDraft, stringify, undo, keepMine, useDoc, isDirty } from '../lib/docs'
import type { Info, Script } from '../lib/types'

const DERIVED = ['03_timesheet/timesheet.json', '05_motion/src/timesheet.json']

export function DocEditor({ slug, path, info, characters }: { slug: string; path: string; info: Info | null; characters?: string[] }) {
  const doc = useDoc(slug, path)
  const isJson = extOf(path) === 'json'
  const [mode, setMode] = useState<'form' | 'raw'>('form')
  const [review, setReview] = useState(false)
  const lastEdit = useRef(0)
  useEffect(() => { void loadDoc(slug, path) }, [slug, path])
  useEffect(() => { setReview(false); setMode(isJson ? 'form' : 'raw') }, [slug, path, isJson])

  const derived = DERIVED.some((d) => path.endsWith(d)) || path.startsWith('05_motion/')
  const readOnly = !!info?.readonly || derived

  const dirty = isDirty(doc)
  const parsed = useMemo(() => (doc?.status === 'ready' && isJson ? parseJson<unknown>(doc.draft) : null), [doc?.draft, doc?.status, isJson])
  const diff = useMemo(() => (review && doc ? collapseDiff(diffLines(doc.disk, doc.draft)) : []), [review, doc?.disk, doc?.draft]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (!readOnly) void doSave() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !(e.target instanceof HTMLTextAreaElement && false)) {
        const t = e.target as HTMLElement
        if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') { e.preventDefault(); e.shiftKey ? redo(slug, path) : undo(slug, path) }
      }
    }
    addEventListener('keydown', on); return () => removeEventListener('keydown', on)
  })
  const doSave = async () => {
    const ok = await save(slug, path)
    if (ok) { toast(`Saved ${path.split('/').pop()}`); setReview(false) }
  }
  const edit = (text: string) => { const now = Date.now(); setDraft(slug, path, text, { coalesce: now - lastEdit.current < 900 }); lastEdit.current = now }

  if (!doc || doc.status === 'loading') return <div className="doc-load" aria-busy="true"><span className="spinner" /> Loading {path.split('/').pop()}</div>
  if (doc.status === 'error') return <Empty icon="alert" title="Could not open this file">{doc.error}</Empty>

  const canForm = isJson && parsed?.ok
  const effectiveMode = canForm ? mode : 'raw'
  const name = path.split('/').pop()!
  const base = path.split('/').slice(-2).join('/')

  return (
    <div className="doc">
      <div className="doc-bar">
        <div className="doc-title">
          <span className="mono">{name}</span>
          {readOnly && <span className="pill"><Icon name="lock" size={12} />{derived ? 'Derived, read-only' : 'Read-only'}</span>}
          {dirty && <span className="pill warn">Unsaved changes</span>}
          {!dirty && !readOnly && doc.mtime > 0 && <span className="dim small">On disk</span>}
        </div>
        <div className="doc-actions">
          {isJson && <Segmented label="Editor view" value={effectiveMode} onChange={setMode} options={[{ value: 'form', label: 'Form', icon: 'form' }, { value: 'raw', label: 'Raw', icon: 'code' }]} />}
          {!readOnly && <>
            <Btn kind="quiet" icon="undo" onClick={() => undo(slug, path)} disabled={!doc.history.length} aria-label="Undo" title="Undo (⌘Z)" />
            <Btn kind="quiet" icon="redo" onClick={() => redo(slug, path)} disabled={!doc.future.length} aria-label="Redo" title="Redo (⇧⌘Z)" />
            <Btn kind="plain" icon="list" onClick={() => setReview((r) => !r)} disabled={!dirty} aria-pressed={review}>Review changes</Btn>
            <Btn kind="primary" icon="save" onClick={doSave} disabled={!dirty || doc.saving || (isJson && !parsed?.ok)}>{doc.saving ? 'Saving…' : 'Save'}</Btn>
          </>}
        </div>
      </div>

      {derived && <div className="banner info"><Icon name="lock" size={15} /><div><strong>This file is generated.</strong> Fix problems upstream: edit <span className="mono">script.json</span> and re-run the timesheet stage, never the frames here.</div></div>}
      {doc.conflict && (
        <div className="banner warn" role="alert"><Icon name="alert" size={15} />
          <div><strong>{base} changed on disk</strong> while you had unsaved edits.</div>
          <Btn kind="plain" onClick={() => reload(slug, path)}>Discard mine, load disk</Btn>
          <Btn kind="plain" onClick={() => keepMine(slug, path)}>Keep mine</Btn>
        </div>
      )}
      {doc.saveError && !doc.conflict && <div className="banner err" role="alert"><Icon name="alert" size={15} /><div>{doc.saveError}</div></div>}
      {isJson && parsed && !parsed.ok && <div className="banner err" role="alert"><Icon name="alert" size={15} /><div><strong>Invalid JSON:</strong> {parsed.error}. Fix it in Raw view to enable the form and Save.</div></div>}

      {review && dirty && (
        <div className="review" role="region" aria-label="Changes to be saved">
          <header><strong>Changes to {name}</strong><span className="push" /><Btn kind="quiet" icon="undo" onClick={() => { revert(slug, path); setReview(false) }}>Discard all</Btn><Btn kind="quiet" icon="x" onClick={() => setReview(false)} aria-label="Close review" /></header>
          <pre>{diff.map((l, i) => 'count' in l
            ? <div key={i} className="d gap">⋯ {l.count} unchanged lines</div>
            : <div key={i} className={cx('d', l.kind)}><span aria-hidden>{l.kind === 'add' ? '+' : l.kind === 'del' ? '−' : ' '}</span>{l.text || ' '}</div>)}</pre>
        </div>
      )}

      <div className="doc-body">
        {effectiveMode === 'raw' || !canForm ? (
          <textarea className="raw mono" spellCheck={false} value={doc.draft} readOnly={readOnly} onChange={(e) => edit(e.target.value)} aria-label={`Raw contents of ${name}`} />
        ) : (
          <FormSwitch path={path} value={(parsed as { value: unknown }).value} readOnly={readOnly} characters={characters} onChange={(v) => edit(stringify(v))} />
        )}
      </div>
    </div>
  )
}

function FormSwitch({ path, value, onChange, readOnly, characters }: { path: string; value: unknown; onChange: (v: unknown) => void; readOnly: boolean; characters?: string[] }) {
  const file = path.split('/').pop()
  if (file === 'script.json' && !readOnly && value && typeof value === 'object' && Array.isArray((value as Script).scenes)) return <ScriptForm value={value as Script} characters={characters} onChange={onChange} />
  if (file === 'idea.json' && !readOnly) return <IdeaForm value={value as never} onChange={onChange} />
  return <div className="form"><JsonNode value={value} readOnly={readOnly} onChange={onChange} /></div>
}
