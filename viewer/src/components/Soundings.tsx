import { useEffect, useMemo, useRef, useState } from 'react'
import { loadPeaks } from '../lib/peaks'
import { fileUrl } from '../lib/api'
import type { SheetScene } from '../lib/types'
import { cx } from '../lib/util'

/**
 * The signature view: the timeline drawn as a hydrographic sounding strip.
 * Each scene is a column of water; the voice track is the sea floor beneath it,
 * contoured in depth bands; the scene's duration is its sounding in seconds;
 * the playhead is the course line in chart magenta.
 */
export function Soundings({ slug, scenes, total, time, active, onSeek, voiceDir = '04_voice' }: {
  slug: string; scenes: (SheetScene & { audio_offset_frames?: number })[]; total: number; time: number
  active: string | null; onSeek: (t: number, id?: string) => void; voiceDir?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(900)
  const [peaks, setPeaks] = useState<Record<string, Float32Array | null>>({})
  const H = 128, TOP = 26, BASE = 84, FLOOR = H - 18

  useEffect(() => {
    const el = wrap.current; if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(320, el.clientWidth)))
    ro.observe(el); setW(Math.max(320, el.clientWidth))
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let live = true
    scenes.forEach((s) => {
      const name = (s.audio || `voice/${s.id}.wav`).split('/').pop()!
      loadPeaks(fileUrl(slug, `${voiceDir}/${name}`), 90).then((p) => { if (live) setPeaks((o) => ({ ...o, [s.id]: p })) })
    })
    return () => { live = false }
  }, [slug, scenes, voiceDir])

  const x = (t: number) => (t / Math.max(total, 0.001)) * w
  const paths = useMemo(() => scenes.map((s) => {
    const p = peaks[s.id]
    if (!p) return null
    const x0 = x(s.start_sec), colW = x(s.duration_sec)
    const off = ((s as { audio_offset_frames?: number }).audio_offset_frames ?? 8) / 30
    const ax0 = x0 + x(off)
    const aw = Math.min(colW - x(off), colW)
    const build = (scale: number) => {
      let d = `M${ax0.toFixed(1)} ${BASE}`
      p.forEach((v, i) => { d += ` L${(ax0 + (i / (p.length - 1)) * aw).toFixed(1)} ${(BASE + v * scale).toFixed(1)}` })
      return d + ` L${(ax0 + aw).toFixed(1)} ${BASE} Z`
    }
    return { shallow: build((FLOOR - BASE) * 0.55), mid: build((FLOOR - BASE) * 0.8), deep: build(FLOOR - BASE) }
  }), [peaks, scenes, w, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = ((e.clientX - r.left) / r.width) * total
    const s = scenes.find((sc) => t >= sc.start_sec && t < sc.start_sec + sc.duration_sec)
    onSeek(t, s?.id)
  }

  return (
    <div className="soundings" ref={wrap}>
      <svg width={w} height={H} onClick={click} role="img" aria-label="Timeline of scene durations and voice track" style={{ display: 'block' }}>
        <defs>
          <pattern id="stipple" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.7" fill="var(--rule)" /></pattern>
        </defs>
        <rect x="0" y={TOP} width={w} height={H - TOP} fill="url(#stipple)" opacity="0.7" />
        {scenes.map((s, i) => {
          const x0 = x(s.start_sec), cw = x(s.duration_sec)
          const on = s.id === active
          const pp = paths[i]
          return (
            <g key={s.id} className={cx('sd-col', on && 'on')}>
              <rect x={x0} y={TOP} width={cw} height={H - TOP} className="sd-water" />
              {pp && <>
                <path d={pp.deep} className="sd-deep" /><path d={pp.mid} className="sd-mid" /><path d={pp.shallow} className="sd-shallow" />
              </>}
              <line x1={x0} x2={x0} y1={6} y2={H} className="sd-tick" />
              <line x1={x0} x2={x0 + cw} y1={BASE} y2={BASE} className="sd-datum" />
              <text x={x0 + 6} y={18} className="sd-depth">{s.duration_sec.toFixed(1)}</text>
              <text x={x0 + 6} y={H - 5} className="sd-id">{s.id}</text>
            </g>
          )
        })}
        <line x1={w - 0.5} x2={w - 0.5} y1={6} y2={H} className="sd-tick" />
        <g transform={`translate(${x(Math.min(time, total))},0)`} className="sd-course" pointerEvents="none">
          <line y1={TOP - 4} y2={H} />
          <path d="M-5 0 L5 0 L0 9 Z" transform="translate(0,2)" />
        </g>
      </svg>
      <div className="sd-scale" aria-hidden="true"><span>0 s</span><span>depth = seconds per scene</span><span>{total.toFixed(1)} s</span></div>
    </div>
  )
}
