import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Icon } from './Icon'
import { fmtTime, cx } from '../lib/util'

export interface VideoHandle { seek: (t: number, play?: boolean) => void; el: HTMLVideoElement | null }

/** Portrait-first video player with a scene-aware scrubber. */
export const VideoPlayer = forwardRef<VideoHandle, {
  src: string; poster?: string; marks?: { t: number; id: string }[]; onTime?: (t: number) => void
  onPlayState?: (p: boolean) => void; className?: string
}>(function VideoPlayer({ src, poster, marks = [], onTime, onPlayState, className }, ref) {
  const v = useRef<HTMLVideoElement>(null)
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [err, setErr] = useState(false)

  useImperativeHandle(ref, () => ({
    el: v.current,
    seek: (time, play) => { const e = v.current; if (!e) return; e.currentTime = time; if (play) void e.play() },
  }))
  useEffect(() => { setErr(false); setT(0) }, [src])

  const toggle = () => { const e = v.current; if (!e) return; e.paused ? void e.play() : e.pause() }
  const step = (dir: -1 | 1) => {
    const e = v.current; if (!e || !marks.length) return
    const cur = e.currentTime
    const next = dir > 0 ? marks.find((m) => m.t > cur + 0.15) : [...marks].reverse().find((m) => m.t < cur - 0.6)
    e.currentTime = next ? next.t : dir > 0 ? d : 0
  }
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); v.current!.currentTime -= e.shiftKey ? 5 : 1 }
    else if (e.key === 'ArrowRight') { e.preventDefault(); v.current!.currentTime += e.shiftKey ? 5 : 1 }
    else if (e.key === ',' ) step(-1)
    else if (e.key === '.') step(1)
    else if (e.key === 'f') void v.current?.requestFullscreen()
  }

  return (
    <div className={cx('vplayer', className)} tabIndex={0} onKeyDown={onKey} aria-label="Video player. Space plays, arrow keys seek, comma and period jump scenes.">
      <div className="vframe" onClick={toggle}>
        {err ? <div className="vmissing"><Icon name="video" size={28} />No render yet</div> : (
          <video
            ref={v} src={src} poster={poster} preload="metadata" playsInline
            onLoadedMetadata={(e) => setD(e.currentTarget.duration)}
            onTimeUpdate={(e) => { setT(e.currentTarget.currentTime); onTime?.(e.currentTarget.currentTime) }}
            onPlay={() => { setPlaying(true); onPlayState?.(true) }}
            onPause={() => { setPlaying(false); onPlayState?.(false) }}
            onError={() => setErr(true)}
          />
        )}
        {!playing && !err && <div className="vbig"><Icon name="play" size={26} /></div>}
      </div>
      <div className="vbar">
        <div className="vscrub">
          <input type="range" min={0} max={d || 1} step={0.01} value={t} aria-label="Seek" onChange={(e) => { if (v.current) v.current.currentTime = Number(e.target.value) }} style={{ ['--p' as string]: `${d ? (t / d) * 100 : 0}%` }} />
          {marks.map((m) => <i key={m.id} className="vmark" style={{ left: `${d ? (m.t / d) * 100 : 0}%` }} />)}
        </div>
        <div className="vctl">
          <button className="ibtn" onClick={() => step(-1)} aria-label="Previous scene" title="Previous scene ( , )"><Icon name="prev" /></button>
          <button className="ibtn big" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} /></button>
          <button className="ibtn" onClick={() => step(1)} aria-label="Next scene" title="Next scene ( . )"><Icon name="next" /></button>
          <span className="mono vtime">{fmtTime(t)} <span className="dim">/ {fmtTime(d)}</span></span>
          <button className="ibtn push" onClick={() => void v.current?.requestFullscreen()} aria-label="Fullscreen" title="Fullscreen ( f )"><Icon name="expand" /></button>
        </div>
      </div>
    </div>
  )
})

/** Compact audio control for one clip. */
export function AudioClip({ src, label, onPlay }: { src: string; label?: string; onPlay?: () => void }) {
  const a = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  return (
    <div className="aclip">
      <audio
        ref={a} src={src} preload="metadata"
        onLoadedMetadata={(e) => setD(e.currentTarget.duration)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onPlay={() => { setPlaying(true); onPlay?.() }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setT(0) }}
      />
      <button className="ibtn round" aria-label={playing ? `Pause ${label ?? 'clip'}` : `Play ${label ?? 'clip'}`} onClick={() => { const e = a.current!; e.paused ? void e.play() : e.pause() }}>
        <Icon name={playing ? 'pause' : 'play'} size={14} />
      </button>
      <input type="range" min={0} max={d || 1} step={0.01} value={t} aria-label="Seek clip" onChange={(e) => { if (a.current) a.current.currentTime = Number(e.target.value) }} style={{ ['--p' as string]: `${d ? (t / d) * 100 : 0}%` }} />
      <span className="mono dim">{fmtTime(t)} / {fmtTime(d)}</span>
    </div>
  )
}
