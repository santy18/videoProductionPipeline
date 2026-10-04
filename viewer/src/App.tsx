import { useEffect, useState } from 'react'
import { api } from './lib/api'
import type { Info, ProjectSummary } from './lib/types'
import { href, useRoute } from './lib/route'
import { dirtyDocs, startPolling, useDirtyCount } from './lib/docs'
import { Icon } from './components/Icon'
import { Home } from './components/Home'
import { OverviewView } from './components/Overview'
import { ScenesView } from './components/Scenes'
import { FilesView } from './components/Files'
import { Empty, Toaster } from './components/ui'
import { cx } from './lib/util'

export default function App() {
  const route = useRoute()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  useDirtyCount()

  useEffect(() => { startPolling() }, [])
  useEffect(() => { api.info().then(setInfo).catch(() => {}) }, [])
  useEffect(() => {
    let live = true
    const pull = () => api.projects().then((p) => { if (live) { setProjects(p); setError(null) } }).catch((e) => live && setError(e.message))
    pull()
    const t = setInterval(pull, 15000)
    return () => { live = false; clearInterval(t) }
  }, [route.slug])
  useEffect(() => { setRailOpen(false) }, [route.slug, route.view])
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirtyDocs().length) { e.preventDefault() } }
    addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn)
  }, [])

  const project = projects?.find((p) => p.slug === route.slug) ?? null
  const dirty = dirtyDocs()

  return (
    <div className={cx('app', railOpen && 'rail-open')}>
      <a className="skip" href="#main">Skip to content</a>
      <aside className="rail" aria-label="Projects">
        <a className="brand" href="#/" aria-label="Studio Viewer home"><Icon name="anchor" size={20} /><span>Studio Viewer</span></a>
        <div className="rail-label">Projects</div>
        <nav>
          <ul>
            {(projects ?? []).map((p) => {
              const d = dirty.some((x) => x.slug === p.slug)
              return (
                <li key={p.slug}>
                  <a href={href({ slug: p.slug, view: 'scenes' })} className={cx('rail-item', route.slug === p.slug && 'on')} aria-current={route.slug === p.slug ? 'page' : undefined}>
                    <span className="ri-title">{p.title}</span>
                    <span className="ri-sub mono">{p.duration ? `${p.duration.toFixed(0)}s` : '—'} · {p.sceneCount} scenes{d ? ' · unsaved' : ''}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="rail-foot">
          <span className="mono">{info?.root ? info.root.split('/').slice(-2).join('/') : 'projects/'}</span>
          {info?.readonly && <span className="pill on-dark"><Icon name="lock" size={11} />Read-only</span>}
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="ibtn menu" onClick={() => setRailOpen(!railOpen)} aria-label="Toggle project list" aria-expanded={railOpen}><Icon name="list" size={18} /></button>
          {project ? (
            <>
              <nav className="where" aria-label="Breadcrumb"><a href="#/">Projects</a><Icon name="chevron" size={12} /><span>{project.title}</span></nav>
              <div className="tabs" role="tablist" aria-label="Project views">
                {([['scenes', 'Scenes', 'scenes'], ['overview', 'Pipeline', 'grid'], ['files', 'Files', 'folder']] as const).map(([v, l, ic]) => (
                  <a key={v} role="tab" aria-selected={route.view === v} className={cx('tab', route.view === v && 'on')} href={href({ slug: project.slug, view: v, file: v === 'files' ? route.file : null })}>
                    <Icon name={ic} size={15} />{l}
                  </a>
                ))}
              </div>
            </>
          ) : <nav className="where"><span>Projects</span></nav>}
        </header>
        <main id="main" className="main">
          {!route.slug && <Home projects={projects} error={error} />}
          {route.slug && !project && projects && <Empty icon="alert" title="Project not found">There is no folder called <span className="mono">{route.slug}</span> in projects/. <a href="#/">Back to projects</a></Empty>}
          {route.slug && project && route.view === 'overview' && <OverviewView project={project} />}
          {route.slug && project && route.view === 'scenes' && <ScenesView slug={project.slug} project={project} info={info} sceneId={route.scene} />}
          {route.slug && project && route.view === 'files' && <FilesView slug={project.slug} file={route.file} info={info} />}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
