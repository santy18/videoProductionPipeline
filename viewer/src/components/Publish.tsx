import { useEffect, useMemo, useState } from 'react'
import { api, downloadUrl, fileUrl, posterUrl } from '../lib/api'
import type { ProjectSummary } from '../lib/types'
import { Icon } from './Icon'
import { AutoText, Empty, toast } from './ui'
import { copyText } from '../lib/util'

interface Draft { title: string; caption: string; hashtags: string }
const keyOf = (slug: string) => `studio-viewer:publish:${slug}`

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button className="btn btn-plain copy" disabled={!text.trim()} aria-label={`Copy ${label}`}
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) { setDone(true); setTimeout(() => setDone(false), 1600); toast(`${label} copied`) } else toast('Copy failed. Select the text and copy it manually.', 'err')
      }}>
      <Icon name={done ? 'check' : 'copy'} size={15} /><span>{done ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

/** Everything needed to post the video, ready to paste into the upload form on a phone. */
export function PublishView({ project }: { project: ProjectSummary }) {
  const slug = project.slug
  const [seed, setSeed] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [hasSrt, setHasSrt] = useState(false)

  useEffect(() => {
    setSeed(null); setDraft(null)
    api.readFile(slug, '01_idea/idea.json').then((f) => {
      const c = JSON.parse(f.text).chosen ?? {}
      const title: string = c.title || project.title
      const words = [...new Set(String(title).toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length > 4))].slice(0, 4)
      const base: Draft = {
        title: String(title).replace(/\s*\((v\d+|.*illustrated.*)\)\s*$/i, ''),
        caption: [c.hook, c.angle && String(c.angle).split('. ')[0]].filter(Boolean).join('\n\n'),
        hashtags: ['#shorts', ...words.map((w) => '#' + w)].join(' '),
      }
      setSources(c.sources ?? [])
      setSeed(base)
      try { const saved = localStorage.getItem(keyOf(slug)); setDraft(saved ? { ...base, ...JSON.parse(saved) } : base) } catch { setDraft(base) }
    }).catch(() => { setSeed({ title: project.title, caption: '', hashtags: '' }); setDraft({ title: project.title, caption: '', hashtags: '' }) })
    api.readFile(slug, '06_render/captions.srt').then(() => setHasSrt(true)).catch(() => setHasSrt(false))
  }, [slug, project.title])

  const update = (p: Partial<Draft>) => setDraft((d) => {
    const n = { ...(d as Draft), ...p }
    try { localStorage.setItem(keyOf(slug), JSON.stringify(n)) } catch { /* private mode */ }
    return n
  })
  const full = useMemo(() => (draft ? `${draft.caption}\n\n${draft.hashtags}`.trim() : ''), [draft])

  if (!draft || !seed) return <div className="doc-load"><span className="spinner" /> Preparing post</div>
  if (!project.hasFinal) return <Empty icon="video" title="Nothing to publish yet">Render the video first, then the file and post text appear here.</Empty>
  const reset = () => { try { localStorage.removeItem(keyOf(slug)) } catch { /* ignore */ } setDraft(seed) }

  return (
    <div className="publish">
      <section className="pub-media" aria-label="Video file">
        <img className="pub-poster" src={posterUrl(slug, 1, 360)} alt="" />
        <a className="btn btn-primary dl" href={downloadUrl(slug, '06_render/final.mp4')} download><Icon name="download" size={16} /><span>Download video</span></a>
        {hasSrt && <a className="btn btn-plain dl" href={downloadUrl(slug, '06_render/captions.srt')} download><Icon name="download" size={15} /><span>Captions (.srt)</span></a>}
        <a className="small" href={fileUrl(slug, '06_render/final.mp4')} target="_blank" rel="noreferrer">Open in a new tab</a>
        <p className="dim small">On a phone, the download lands in Files or Downloads. On iPhone, long-press the video in the new tab and choose Save to Photos if you prefer.</p>
      </section>

      <section className="pub-text">
        <header className="page-head">
          <h1>Post text</h1>
          <p className="dim">Prefilled from the chosen idea. Edit freely; changes stay in this browser and never touch the project files.</p>
        </header>
        <div className="pub-block">
          <div className="pub-head"><h2>Title</h2><CopyBtn text={draft.title} label="Title" /></div>
          <input className="input" value={draft.title} onChange={(e) => update({ title: e.target.value })} aria-label="Title" />
        </div>
        <div className="pub-block">
          <div className="pub-head"><h2>Caption</h2><CopyBtn text={draft.caption} label="Caption" /></div>
          <AutoText value={draft.caption} rows={3} onChange={(v) => update({ caption: v })} aria-label="Caption" />
        </div>
        <div className="pub-block">
          <div className="pub-head"><h2>Hashtags</h2><CopyBtn text={draft.hashtags} label="Hashtags" /></div>
          <AutoText value={draft.hashtags} rows={1} onChange={(v) => update({ hashtags: v })} aria-label="Hashtags" />
          <p className="dim small">Suggested from the title. Swap in the tags you actually use.</p>
        </div>
        <div className="pub-all">
          <CopyBtn text={full} label="Caption and hashtags" />
          <span className="dim small">Copies caption and hashtags together</span>
          <button className="btn btn-quiet push" onClick={reset}>Reset to idea</button>
        </div>
        {sources.length > 0 && (
          <div className="pub-block">
            <div className="pub-head"><h2>Sources</h2><CopyBtn text={sources.join('\n')} label="Sources" /></div>
            <ul className="pub-src">{sources.map((s, i) => <li key={i} className="mono small">{s}</li>)}</ul>
          </div>
        )}
      </section>
    </div>
  )
}
