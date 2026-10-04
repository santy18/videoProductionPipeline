import type { Info, ProjectSummary, TreeNode } from './types'

async function j<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error || res.statusText), { status: res.status, body })
  return body as T
}

export const api = {
  info: () => fetch('/api/info').then(j<Info>),
  projects: () => fetch('/api/projects').then(j<ProjectSummary[]>),
  project: (slug: string) => fetch(`/api/projects/${enc(slug)}`).then(j<ProjectSummary>),
  tree: (slug: string) => fetch(`/api/projects/${enc(slug)}/tree`).then(j<TreeNode[]>),
  readFile: (slug: string, path: string) =>
    fetch(`/api/projects/${enc(slug)}/file?path=${encodeURIComponent(path)}`).then(j<{ text: string; mtime: number; size: number }>),
  writeFile: (slug: string, path: string, text: string, baseMtime: number) =>
    fetch(`/api/projects/${enc(slug)}/file?path=${encodeURIComponent(path)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Viewer': '1' },
      body: JSON.stringify({ text, baseMtime }),
    }).then(j<{ mtime: number }>),
  stat: (slug: string, paths: string[]) =>
    fetch(`/api/projects/${enc(slug)}/stat?paths=${encodeURIComponent(paths.join('\n'))}`).then(j<Record<string, number | null>>),
  queue: (entry: Record<string, unknown>) =>
    fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Viewer': '1' }, body: JSON.stringify(entry) }).then(j<{ queued: boolean }>),
}

const enc = encodeURIComponent
export const fileUrl = (slug: string, path: string) => `/files/${enc(slug)}/${path.split('/').map(enc).join('/')}`
export const thumbUrl = (slug: string, path: string, w = 240) => `/api/thumb/${enc(slug)}?path=${encodeURIComponent(path)}&w=${w}`
export const posterUrl = (slug: string, t = 1, w = 360) => `/api/poster/${enc(slug)}?t=${t}&w=${w}`
