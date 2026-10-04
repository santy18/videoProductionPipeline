import { useEffect, useState } from 'react'

export interface Route { slug: string | null; view: 'scenes' | 'overview' | 'files' | 'publish'; file: string | null; scene: string | null }

export function parseHash(h: string): Route {
  const parts = h.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] !== 'p' || !parts[1]) return { slug: null, view: 'overview', file: null, scene: null }
  const view = (parts[2] === 'files' || parts[2] === 'overview' || parts[2] === 'publish' ? parts[2] : 'scenes') as Route['view']
  const q = new URLSearchParams(h.split('?')[1] || '')
  return { slug: parts[1], view, file: view === 'files' ? parts.slice(3).join('/') || null : null, scene: q.get('scene') }
}
export function href(r: Partial<Route> & { slug: string | null }) {
  if (!r.slug) return '#/'
  const base = `#/p/${encodeURIComponent(r.slug)}`
  const v = r.view ?? 'scenes'
  if (v === 'files') return `${base}/files${r.file ? '/' + r.file.split('/').map(encodeURIComponent).join('/') : ''}`
  return `${base}/${v}${r.scene ? `?scene=${r.scene}` : ''}`
}
export function useRoute(): Route {
  const [r, setR] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setR(parseHash(location.hash))
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return r
}
export const go = (h: string) => { location.hash = h }
