import { posterUrl } from '../lib/api'
import type { ProjectSummary } from '../lib/types'
import { Empty } from './ui'
import { Icon } from './Icon'
import { StageStrip } from './Overview'
import { fmtAgo, fmtBytes } from '../lib/util'
import { href } from '../lib/route'

export function Home({ projects, error }: { projects: ProjectSummary[] | null; error: string | null }) {
  if (error) return <Empty icon="alert" title="Can't reach the project server">{error}. Start it with <span className="mono">npm run dev</span> in <span className="mono">viewer/</span>.</Empty>
  if (!projects) return <div className="doc-load"><span className="spinner" /> Reading projects…</div>
  if (!projects.length) return <Empty title="No projects yet">Create one with <span className="mono">new_project.py</span> and it will appear here.</Empty>
  return (
    <div className="home">
      <header className="page-head">
        <h1>Projects</h1>
        <p className="dim">{projects.length} videos in <span className="mono">projects/</span>. Open one to review scenes, listen to voice, and edit the script.</p>
      </header>
      <ul className="proj-list">
        {projects.map((p) => (
          <li key={p.slug}>
            <a className="proj" href={href({ slug: p.slug, view: 'scenes' })}>
              <div className="proj-poster">
                {p.hasFinal ? <img src={posterUrl(p.slug, 1, 360)} alt="" loading="lazy" /> : <span className="poster-blank"><Icon name="video" size={22} /></span>}
              </div>
              <div className="proj-main">
                <h2>{p.title}</h2>
                {p.hook && <p className="hook">“{p.hook}”</p>}
                <StageStrip stages={p.stages} compact />
              </div>
              <dl className="proj-facts">
                <div><dt>Length</dt><dd className="mono">{p.duration ? `${p.duration.toFixed(1)} s` : '—'}</dd></div>
                <div><dt>Scenes</dt><dd className="mono">{p.sceneCount || '—'}</dd></div>
                <div><dt>Format</dt><dd className="mono">{p.width && p.height ? `${p.width}×${p.height}` : '—'}</dd></div>
                <div><dt>On disk</dt><dd className="mono">{fmtBytes(p.size)}</dd></div>
                <div><dt>Touched</dt><dd>{fmtAgo(p.mtime)}</dd></div>
              </dl>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
