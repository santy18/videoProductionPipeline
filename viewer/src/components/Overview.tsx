import type { ProjectSummary, Stage } from '../lib/types'
import { Icon } from './Icon'
import { StateBadge } from './ui'
import { cx, fmtBytes } from '../lib/util'
import { href } from '../lib/route'

const STAGE_FILE: Record<string, string> = {
  '01_idea': '01_idea/idea.json', '02_script': '02_script/script.json', '03_timesheet': '03_timesheet/timesheet.json',
  '04_voice': '04_voice/manifest.json', '05_motion': '05_motion/src/Video.tsx', '06_render': '06_render/final.mp4',
}
const STAGE_NOTE: Record<string, string> = {
  '01_idea': 'Chosen idea, hook, claims and their sources',
  '02_script': 'Scenes: narration, on-screen text, image prompts',
  '03_timesheet': 'Derived timings and caption chunks. Never hand-edited',
  '04_voice': 'One wav per scene from the voice provider',
  '05_motion': 'Remotion composition rendered from the timesheet',
  '06_render': 'raw.mp4, final.mp4 with captions, captions.srt',
}

/** Six stage ticks, drawn like the legs of a passage plan. */
export function StageStrip({ stages, compact }: { stages: Stage[]; compact?: boolean }) {
  return (
    <ol className={cx('stages', compact && 'compact')} aria-label="Pipeline stages">
      {stages.map((s) => (
        <li key={s.id} className={cx('stage', s.state)}>
          <i aria-hidden />
          <span>{s.label}</span>
          <span className="sr">{s.state === 'done' ? 'ready' : s.state === 'partial' ? 'partial' : 'not run'}</span>
        </li>
      ))}
    </ol>
  )
}

export function OverviewView({ project }: { project: ProjectSummary }) {
  return (
    <div className="overview">
      <header className="page-head">
        <h1>{project.title}</h1>
        {project.hook && <p className="hook big">“{project.hook}”</p>}
      </header>
      <StageStrip stages={project.stages} />
      <ul className="stage-rows">
        {project.stages.map((s, i) => (
          <li key={s.id}>
            <a href={href({ slug: project.slug, view: 'files', file: STAGE_FILE[s.id] })} className="stage-row">
              <span className="mono sn">{String(i + 1).padStart(2, '0')}</span>
              <span className="sl"><strong>{s.label}</strong><span className="dim small">{STAGE_NOTE[s.id]}</span></span>
              <span className="mono dim small">{s.detail ?? ''}</span>
              <StateBadge state={s.state} />
              <Icon name="chevron" size={14} />
            </a>
          </li>
        ))}
      </ul>
      <dl className="facts-row">
        <div><dt>Length</dt><dd className="mono">{project.duration ? `${project.duration.toFixed(1)} s` : '—'}</dd></div>
        <div><dt>Scenes</dt><dd className="mono">{project.sceneCount}</dd></div>
        <div><dt>Generated images</dt><dd className="mono">{project.visualCount}</dd></div>
        <div><dt>Size on disk</dt><dd className="mono">{fmtBytes(project.size)}</dd></div>
      </dl>
    </div>
  )
}
