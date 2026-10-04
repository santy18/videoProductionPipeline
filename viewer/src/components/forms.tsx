import { useState } from 'react'
import { AutoText, Btn, Field } from './ui'
import { Icon } from './Icon'
import type { Script, ScriptScene } from '../lib/types'
import { cx } from '../lib/util'

type J = unknown
const isObj = (v: J): v is Record<string, J> => typeof v === 'object' && v !== null && !Array.isArray(v)
const HEX = /^#[0-9a-fA-F]{6}$/

const label = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/, (c) => c.toUpperCase())
const blankLike = (v: J): J => (Array.isArray(v) ? [] : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)])) : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : '')

/* ---------- Generic recursive editor: any JSON becomes a readable form ---------- */
export function JsonNode({ name, value, onChange, depth = 0, readOnly }: { name?: string; value: J; onChange: (v: J) => void; depth?: number; readOnly?: boolean }) {
  if (Array.isArray(value)) return <ArrayNode name={name} value={value} onChange={onChange} depth={depth} readOnly={readOnly} />
  if (isObj(value)) {
    return (
      <fieldset className={cx('grp', depth === 0 && 'top')}>
        {name && <legend>{label(name)}</legend>}
        <div className="grp-body">
          {Object.entries(value).map(([k, v]) => (
            <JsonNode key={k} name={k} value={v} depth={depth + 1} readOnly={readOnly} onChange={(nv) => onChange({ ...value, [k]: nv })} />
          ))}
        </div>
      </fieldset>
    )
  }
  const nm = name ?? 'value'
  if (typeof value === 'boolean') {
    return <label className="field inline"><input type="checkbox" checked={value} disabled={readOnly} onChange={(e) => onChange(e.target.checked)} /><span className="field-label">{label(nm)}</span></label>
  }
  if (typeof value === 'number') {
    return <Field label={label(nm)}><input className="input mono" type="number" step="any" value={value} disabled={readOnly} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></Field>
  }
  if (value === null) return <Field label={label(nm)}><span className="dim mono">null</span></Field>
  const s = String(value)
  if (HEX.test(s)) {
    return (
      <Field label={label(nm)}>
        <span className="color-row">
          <input type="color" value={s} disabled={readOnly} onChange={(e) => onChange(e.target.value)} aria-label={`${label(nm)} colour`} />
          <input className="input mono" value={s} disabled={readOnly} onChange={(e) => onChange(e.target.value)} />
        </span>
      </Field>
    )
  }
  const long = s.length > 70 || s.includes('\n')
  return (
    <Field label={label(nm)} wide={long}>
      {long ? <AutoText value={s} readOnly={readOnly} onChange={onChange} rows={2} /> : <input className="input" value={s} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}

function ArrayNode({ name, value, onChange, depth, readOnly }: { name?: string; value: J[]; onChange: (v: J) => void; depth: number; readOnly?: boolean }) {
  const prim = value.every((v) => typeof v === 'string')
  const set = (i: number, v: J) => onChange(value.map((x, k) => (k === i ? v : x)))
  const del = (i: number) => onChange(value.filter((_, k) => k !== i))
  const add = () => onChange([...value, value.length ? blankLike(value[value.length - 1]) : ''])
  return (
    <fieldset className="grp list">
      {name && <legend>{label(name)} <span className="count">{value.length}</span></legend>}
      <div className="grp-body">
        {value.length === 0 && <p className="dim small">Empty list</p>}
        {value.map((v, i) => (
          <div key={i} className={cx('li', prim && 'prim')}>
            <div className="li-main">
              {prim ? (
                <input className="input" value={String(v)} readOnly={readOnly} aria-label={`${name ?? 'item'} ${i + 1}`} onChange={(e) => set(i, e.target.value)} />
              ) : (
                <JsonNode name={isObj(v) ? String((v as Record<string, J>).name ?? (v as Record<string, J>).id ?? `item ${i + 1}`) : `item ${i + 1}`} value={v} depth={depth + 1} readOnly={readOnly} onChange={(nv) => set(i, nv)} />
              )}
            </div>
            {!readOnly && <button className="ibtn" onClick={() => del(i)} aria-label={`Remove ${name ?? 'item'} ${i + 1}`}><Icon name="trash" size={14} /></button>}
          </div>
        ))}
        {!readOnly && <Btn icon="plus" kind="quiet" onClick={add}>Add</Btn>}
      </div>
    </fieldset>
  )
}

/* ---------- Scene editor (used by the Scenes view and the script form) ---------- */
const TYPES = ['kinetic', 'diagram', 'broll', 'stat', 'quote', 'outro', 'title']
const MOTIONS = ['push-in', 'pull-out', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'static']

export function SceneEditor({ scene, onChange, characters }: { scene: ScriptScene; onChange: (s: ScriptScene) => void; characters?: string[] }) {
  const on = scene.on_screen ?? {}
  const vis = scene.visual
  const set = (p: Partial<ScriptScene>) => onChange({ ...scene, ...p })
  const setOn = (p: Record<string, J>) => set({ on_screen: { ...on, ...p } })
  const setVis = (p: Record<string, J>) => set({ visual: { ...(vis ?? {}), ...p } })
  const known = new Set(['text', 'heading', 'labels'])
  const extra = Object.entries(on).filter(([k]) => !known.has(k))
  const types = TYPES.includes(scene.type) ? TYPES : [scene.type, ...TYPES]
  return (
    <div className="scene-ed">
      <Field label="Narration" wide hint={`${scene.narration.trim().split(/\s+/).filter(Boolean).length} words, about ${(scene.narration.trim().split(/\s+/).filter(Boolean).length / 160 * 60).toFixed(1)} s at 160 wpm`}>
        <AutoText value={scene.narration} rows={2} onChange={(v) => set({ narration: v })} />
      </Field>
      <div className="row2">
        <Field label="Scene type">
          <select className="input" value={scene.type} onChange={(e) => set({ type: e.target.value })}>{types.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        {'text' in on || !('heading' in on) ? (
          <Field label="On-screen text" hint="Wrap a word in *asterisks* to highlight it">
            <input className="input" value={String(on.text ?? '')} onChange={(e) => setOn({ text: e.target.value })} />
          </Field>
        ) : null}
        {'heading' in on && (
          <Field label="Heading"><input className="input" value={String(on.heading ?? '')} onChange={(e) => setOn({ heading: e.target.value })} /></Field>
        )}
      </div>
      {Array.isArray(on.labels) && (
        <Field label="Labels" wide>
          <TagList value={on.labels as string[]} onChange={(v) => setOn({ labels: v })} />
        </Field>
      )}
      {extra.filter(([k]) => k !== 'labels').map(([k, v]) => (
        <JsonNode key={k} name={k} value={v} onChange={(nv) => setOn({ [k]: nv })} />
      ))}
      {vis ? (
        <fieldset className="grp sub">
          <legend>Visual</legend>
          <div className="grp-body">
            <Field label="Image prompt" wide><AutoText value={String(vis.prompt ?? '')} rows={2} onChange={(v) => setVis({ prompt: v })} /></Field>
            <div className="row2">
              <Field label="Shot"><input className="input" value={String(vis.shot ?? '')} onChange={(e) => setVis({ shot: e.target.value })} /></Field>
              <Field label="Camera motion">
                <select className="input" value={String(vis.motion ?? 'push-in')} onChange={(e) => setVis({ motion: e.target.value })}>
                  {(MOTIONS.includes(String(vis.motion)) ? MOTIONS : [String(vis.motion), ...MOTIONS]).map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Characters in shot" wide>
              <TagList value={(vis.characters as string[]) ?? []} options={characters} onChange={(v) => setVis({ characters: v })} />
            </Field>
          </div>
        </fieldset>
      ) : (
        <p className="dim small">This scene has no generated image. It is drawn by the motion layer.</p>
      )}
    </div>
  )
}

export function TagList({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options?: string[] }) {
  const [draft, setDraft] = useState('')
  const add = (t: string) => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft('') }
  return (
    <div className="tags">
      {value.map((t) => (
        <span className="tag" key={t}>{t}<button onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><Icon name="x" size={11} /></button></span>
      ))}
      <input
        className="tag-in" value={draft} list={options ? 'tag-opts' : undefined} placeholder="Add…" aria-label="Add item"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft) } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)) }}
        onBlur={() => add(draft)}
      />
      {options && <datalist id="tag-opts">{options.map((o) => <option key={o} value={o} />)}</datalist>}
    </div>
  )
}

/* ---------- Script ---------- */
export function ScriptForm({ value, onChange, characters }: { value: Script; onChange: (v: Script) => void; characters?: string[] }) {
  const setScene = (i: number, s: ScriptScene) => onChange({ ...value, scenes: value.scenes.map((x, k) => (k === i ? s : x)) })
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= value.scenes.length) return
    const s = [...value.scenes]; [s[i], s[j]] = [s[j], s[i]]; onChange({ ...value, scenes: s })
  }
  const del = (i: number) => onChange({ ...value, scenes: value.scenes.filter((_, k) => k !== i) })
  const add = () => {
    const n = value.scenes.length + 1
    onChange({ ...value, scenes: [...value.scenes, { id: `s${String(n).padStart(2, '0')}`, type: 'broll', narration: '', on_screen: { text: '' }, visual: { prompt: '', characters: [], shot: '', motion: 'push-in' } }] })
  }
  const rest = Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'scenes' && k !== 'title'))
  return (
    <div className="form">
      <Field label="Title"><input className="input" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></Field>
      {Object.keys(rest).length > 0 && <JsonNode value={rest} onChange={(r) => onChange({ ...value, ...(r as object) })} />}
      <h3 className="form-h">Scenes <span className="count">{value.scenes.length}</span></h3>
      {value.scenes.map((s, i) => (
        <section key={s.id + i} className="scene-block">
          <header>
            <span className="mono sid">{s.id}</span>
            <span className="dim small">{s.type}</span>
            <span className="push" />
            <button className="ibtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${s.id} up`}><Icon name="down" size={14} className="flip" /></button>
            <button className="ibtn" onClick={() => move(i, 1)} disabled={i === value.scenes.length - 1} aria-label={`Move ${s.id} down`}><Icon name="down" size={14} /></button>
            <button className="ibtn" onClick={() => del(i)} aria-label={`Delete ${s.id}`}><Icon name="trash" size={14} /></button>
          </header>
          <SceneEditor scene={s} characters={characters} onChange={(ns) => setScene(i, ns)} />
        </section>
      ))}
      <Btn icon="plus" onClick={add}>Add scene</Btn>
      <p className="dim small">Moving or deleting scenes changes ids downstream. Re-run the timesheet and voice stages afterwards.</p>
    </div>
  )
}

/* ---------- Idea ---------- */
interface Idea { chosen?: { title?: string; angle?: string; hook?: string; audience?: string; claims?: { claim: string; source: number }[]; sources?: string[]; notes?: string; [k: string]: J }; alternatives?: J[]; created?: string; [k: string]: J }
export function IdeaForm({ value, onChange }: { value: Idea; onChange: (v: Idea) => void }) {
  const c = value.chosen
  if (!c) return <JsonNode value={value} onChange={(v) => onChange(v as Idea)} />
  const set = (p: Partial<NonNullable<Idea['chosen']>>) => onChange({ ...value, chosen: { ...c, ...p } })
  const sources = c.sources ?? []
  const claims = c.claims ?? []
  return (
    <div className="form">
      <Field label="Title"><input className="input" value={c.title ?? ''} onChange={(e) => set({ title: e.target.value })} /></Field>
      <Field label="Hook (first line the viewer hears)" wide><AutoText value={c.hook ?? ''} onChange={(v) => set({ hook: v })} /></Field>
      <Field label="Angle" wide><AutoText value={c.angle ?? ''} rows={2} onChange={(v) => set({ angle: v })} /></Field>
      <Field label="Audience"><input className="input" value={c.audience ?? ''} onChange={(e) => set({ audience: e.target.value })} /></Field>

      <h3 className="form-h">Claims and their sources <span className="count">{claims.length}</span></h3>
      <p className="dim small">Every factual claim needs a source. Unsourced claims fail the pipeline's rules.</p>
      {claims.map((cl, i) => (
        <div className="claim" key={i}>
          <AutoText value={cl.claim} aria-label={`Claim ${i + 1}`} onChange={(v) => set({ claims: claims.map((x, k) => (k === i ? { ...x, claim: v } : x)) })} />
          <select className="input src" aria-label={`Source for claim ${i + 1}`} value={cl.source} onChange={(e) => set({ claims: claims.map((x, k) => (k === i ? { ...x, source: Number(e.target.value) } : x)) })}>
            {sources.map((s, k) => <option key={k} value={k}>[{k + 1}] {hostOf(s)}</option>)}
            {cl.source >= sources.length && <option value={cl.source}>[{cl.source + 1}] missing</option>}
          </select>
          <button className="ibtn" onClick={() => set({ claims: claims.filter((_, k) => k !== i) })} aria-label={`Remove claim ${i + 1}`}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      <Btn icon="plus" kind="quiet" onClick={() => set({ claims: [...claims, { claim: '', source: 0 }] })}>Add claim</Btn>

      <h3 className="form-h">Sources <span className="count">{sources.length}</span></h3>
      {sources.map((s, i) => (
        <div className="li prim" key={i}>
          <span className="mono dim srcn">[{i + 1}]</span>
          <input className="input" value={s} aria-label={`Source ${i + 1}`} onChange={(e) => set({ sources: sources.map((x, k) => (k === i ? e.target.value : x)) })} />
          {/^https?:/.test(s) && <a className="ibtn" href={s} target="_blank" rel="noreferrer" aria-label={`Open source ${i + 1}`}><Icon name="chevron" size={14} /></a>}
        </div>
      ))}
      <Btn icon="plus" kind="quiet" onClick={() => set({ sources: [...sources, ''] })}>Add source</Btn>

      <Field label="Notes" wide><AutoText value={c.notes ?? ''} rows={2} onChange={(v) => set({ notes: v })} /></Field>
      {value.alternatives && value.alternatives.length > 0 && (
        <details className="alts">
          <summary>Unused alternatives ({value.alternatives.length})</summary>
          <JsonNode value={value.alternatives} name="alternatives" onChange={(v) => onChange({ ...value, alternatives: v as J[] })} />
        </details>
      )}
    </div>
  )
}
function hostOf(u: string) { try { return new URL(u).host.replace(/^www\./, '') } catch { return u || 'empty' } }
