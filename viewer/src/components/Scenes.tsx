import { useEffect, useMemo, useRef, useState } from 'react'
import { api, fileUrl, posterUrl, thumbUrl } from '../lib/api'
import { loadDoc, parseJson, save, setDraft, stringify, useDoc, isDirty, revert } from '../lib/docs'
import type { Info, ProjectSummary, Script, ScriptScene, Timesheet, SheetScene } from '../lib/types'
import { Soundings } from './Soundings'
import { AudioClip, VideoPlayer, type VideoHandle } from './Players'
import { SceneEditor } from './forms'
import { Btn, Empty, toast } from './ui'
import { Icon } from './Icon'
import { cx, fmtTime } from '../lib/util'
import { href } from '../lib/route'

const SCRIPT = '02_script/script.json'
const SHEET = '03_timesheet/timesheet.json'
const ART = '02_script/art_direction.json'

export function ScenesView({ slug, project, info, sceneId }: { slug: string; project: ProjectSummary; info: Info | null; sceneId: string | null }) {
  const scriptDoc = useDoc(slug, SCRIPT)
  const [sheet, setSheet] = useState<Timesheet | null>(null)
  const [chars, setChars] = useState<string[]>([])
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const video = useRef<VideoHandle>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadDoc(slug, SCRIPT)
    setSheet(null)
    api.readFile(slug, SHEET).then((f) => setSheet(JSON.parse(f.text))).catch(() => setSheet(null))
    api.readFile(slug, ART).then((f) => setChars((JSON.parse(f.text).characters ?? []).map((c: { id: string }) => c.id))).catch(() => setChars([]))
  }, [slug])

  const script = useMemo(() => {
    if (scriptDoc?.status !== 'ready') return null
    const p = parseJson<Script>(scriptDoc.draft)
    return p.ok ? p.value : null
  }, [scriptDoc?.draft, scriptDoc?.status])
  const diskScript = useMemo(() => {
    if (scriptDoc?.status !== 'ready') return null
    const p = parseJson<Script>(scriptDoc.disk); return p.ok ? p.value : null
  }, [scriptDoc?.disk, scriptDoc?.status])

  const sheetById = useMemo(() => new Map((sheet?.scenes ?? []).map((s) => [s.id, s])), [sheet])
  const scenes = script?.scenes ?? []
  const total = sheet?.total_sec ?? project.duration ?? 0
  const activeId = useMemo(() => {
    const s = (sheet?.scenes ?? []).find((x) => time >= x.start_sec && time < x.start_sec + x.duration_sec)
    return s?.id ?? null
  }, [sheet, time])

  useEffect(() => { // follow playback
    if (!playing || !activeId) return
    listRef.current?.querySelector(`[data-scene="${activeId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId, playing])
  useEffect(() => { if (sceneId) setOpen(sceneId) }, [sceneId])

  const updateScene = (i: number, s: ScriptScene) => {
    if (!script) return
    setDraft(slug, SCRIPT, stringify({ ...script, scenes: script.scenes.map((x, k) => (k === i ? s : x)) }), { coalesce: false })
  }
  const seekScene = (id: string, play = true) => {
    const s = sheetById.get(id)
    if (s && video.current) video.current.seek(s.start_sec + 0.01, play)
  }
  const marks = (sheet?.scenes ?? []).map((s) => ({ t: s.start_sec, id: s.id }))
  const dirty = isDirty(scriptDoc)
  const current = scenes.find((s) => s.id === (activeId ?? scenes[0]?.id))
  const hasFinal = project.hasFinal

  if (!scriptDoc || scriptDoc.status === 'loading') return <div className="doc-load"><span className="spinner" /> Loading script</div>
  if (!script) return <Empty icon="scenes" title="No script yet">This project has no readable <span className="mono">02_script/script.json</span>. Run the script stage, or open the Files view to inspect what exists.</Empty>

  return (
    <div className="scenes-layout">
      <div className="scenes-main">
        {sheet && sheet.scenes.length > 0 ? (
          <Soundings slug={slug} scenes={sheet.scenes} total={total} time={time} active={activeId}
            onSeek={(t) => video.current?.seek(t)} />
        ) : (
          <div className="banner info"><Icon name="alert" size={15} /><div>No timesheet yet, so there are no scene timings to draw. Run the timesheet stage to see the soundings strip.</div></div>
        )}

        {dirty && (
          <div className="savebar" role="region" aria-label="Unsaved script changes">
            <Icon name="alert" size={15} />
            <span>Unsaved edits to <span className="mono">script.json</span></span>
            <span className="push" />
            <a className="small" href={href({ slug, view: 'files', file: SCRIPT })}>Review diff</a>
            <Btn kind="quiet" icon="undo" onClick={() => revert(slug, SCRIPT)}>Discard</Btn>
            <Btn kind="primary" icon="save" disabled={info?.readonly} onClick={async () => { if (await save(slug, SCRIPT)) toast('Script saved. Re-run timesheet and voice for changed scenes.') }}>Save script</Btn>
          </div>
        )}

        <div className="scene-list" ref={listRef}>
          {scenes.map((s, i) => {
            const ts = sheetById.get(s.id)
            const disk = diskScript?.scenes.find((x) => x.id === s.id)
            const staleSheet = ts && ts.narration !== s.narration
            const isOpen = open === s.id
            return (
              <SceneRow key={s.id + i} slug={slug} scene={s} ts={ts} active={activeId === s.id} open={isOpen}
                changed={!!disk && JSON.stringify(disk) !== JSON.stringify(s)} stale={!!staleSheet}
                onToggle={() => setOpen(isOpen ? null : s.id)} onPlay={() => seekScene(s.id)}
                onChange={(ns) => updateScene(i, ns)} characters={chars} />
            )
          })}
        </div>
      </div>

      <aside className="scenes-side" aria-label="Preview">
        <div className="side-sticky">
          {hasFinal ? (
            <VideoPlayer ref={video} src={fileUrl(slug, '06_render/final.mp4')} poster={posterUrl(slug, 1, 540)} marks={marks} onTime={setTime} onPlayState={setPlaying} />
          ) : (
            <div className="no-render"><Icon name="video" size={28} /><strong>No final render</strong><span className="dim small">Run the render stage to preview the video here.</span></div>
          )}
          {current && (
            <div className="now">
              <div className="now-head">
                <span className="mono sid">{current.id}</span>
                <span className="dim small">{current.type}</span>
                {sheetById.get(current.id) && <span className="mono dim small push">{fmtTime(sheetById.get(current.id)!.start_sec)} – {fmtTime(sheetById.get(current.id)!.start_sec + sheetById.get(current.id)!.duration_sec)}</span>}
              </div>
              <p className="now-line">{current.narration}</p>
              <AudioClip src={fileUrl(slug, `04_voice/${current.id}.wav`)} label={`${current.id} voice`} onPlay={() => video.current?.el?.pause()} />
              <Btn icon="refresh" kind="quiet" disabled title="Coming soon: sends a regenerate request to a Claude session">Regenerate scene</Btn>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function SceneRow({ slug, scene, ts, active, open, changed, stale, onToggle, onPlay, onChange, characters }: {
  slug: string; scene: ScriptScene; ts?: SheetScene; active: boolean; open: boolean; changed: boolean; stale: boolean
  onToggle: () => void; onPlay: () => void; onChange: (s: ScriptScene) => void; characters: string[]
}) {
  const [imgOk, setImgOk] = useState(true)
  const hasVisual = !!scene.visual
  const on = scene.on_screen ?? {}
  const caption = (on.text ?? on.heading ?? '') as string
  return (
    <article className={cx('scene', active && 'active', open && 'open')} data-scene={scene.id}>
      <div className="scene-head">
        <button className="scene-thumb" onClick={onPlay} aria-label={`Play ${scene.id} in the video`} title="Play from this scene">
          {hasVisual && imgOk ? <img src={thumbUrl(slug, `03_visuals/${scene.id}.png`, 160)} alt="" loading="lazy" onError={() => setImgOk(false)} /> : <span className="thumb-blank">{hasVisual ? <Icon name="image" size={18} /> : <Icon name="scenes" size={18} />}</span>}
          <span className="thumb-play"><Icon name="play" size={16} /></span>
        </button>
        <div className="scene-body">
          <div className="scene-meta">
            <span className="mono sid">{scene.id}</span>
            <span className="type">{scene.type}</span>
            {ts && <span className="mono dim small">{fmtTime(ts.start_sec)} · {ts.duration_sec.toFixed(1)} s</span>}
            {changed && <span className="pill warn">Edited</span>}
            {stale && <span className="pill" title="The timesheet still holds the old narration">Timesheet out of date</span>}
          </div>
          <p className="narr">{scene.narration || <span className="dim">No narration</span>}</p>
          {caption && <p className="onscreen"><Icon name="text" size={12} />{String(caption).replace(/\*/g, '')}</p>}
        </div>
        <button className={cx('ibtn exp', open && 'on')} onClick={onToggle} aria-expanded={open} aria-label={open ? `Close editor for ${scene.id}` : `Edit ${scene.id}`}>
          <Icon name="form" size={16} /><span>{open ? 'Close' : 'Edit'}</span>
        </button>
      </div>
      {open && <div className="scene-edit"><SceneEditor scene={scene} onChange={onChange} characters={characters} /></div>}
    </article>
  )
}
