import { useEffect, useMemo, useState } from 'react'
import { api, fileUrl } from '../lib/api'
import type { Info, TreeNode } from '../lib/types'
import { Icon } from './Icon'
import { DocEditor } from './DocEditor'
import { AudioClip, VideoPlayer } from './Players'
import { Empty } from './ui'
import { cx, extOf, fmtBytes } from '../lib/util'
import { href } from '../lib/route'
import { useDirtyCount, dirtyDocs } from '../lib/docs'

const kindOf = (p: string) => {
  const e = extOf(p)
  if (['json'].includes(e)) return 'json'
  if (['mp4', 'webm', 'mov'].includes(e)) return 'video'
  if (['wav', 'mp3', 'm4a'].includes(e)) return 'audio'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(e)) return 'image'
  if (['md', 'srt', 'txt', 'ts', 'tsx', 'js', 'css', 'html'].includes(e)) return 'text'
  return 'other'
}
const iconFor = (n: TreeNode) => (n.dir ? 'folder' : ({ json: 'json', video: 'video', audio: 'audio', image: 'image', text: 'text', other: 'file' } as const)[kindOf(n.path)])

export function FilesView({ slug, file, info, characters }: { slug: string; file: string | null; info: Info | null; characters?: string[] }) {
  const [tree, setTree] = useState<TreeNode[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { setTree(null); api.tree(slug).then(setTree).catch((e) => setErr(e.message)) }, [slug])
  useDirtyCount()
  const dirtyPaths = new Set(dirtyDocs().filter((d) => d.slug === slug).map((d) => d.path))

  return (
    <div className="files">
      <nav className="tree" aria-label="Project files">
        {err && <p className="err small">{err}</p>}
        {!tree && !err && <p className="dim small pad"><span className="spinner" /> Reading folder…</p>}
        {tree && <TreeList nodes={tree} slug={slug} current={file} depth={0} dirty={dirtyPaths} />}
      </nav>
      <section className="file-pane">
        {file ? <FileViewer key={slug + file} slug={slug} path={file} info={info} characters={characters} /> : <Empty title="Choose a file" icon="folder">Select any file on the left. JSON opens as a form you can edit, media plays in place.</Empty>}
      </section>
    </div>
  )
}

function TreeList({ nodes, slug, current, depth, dirty }: { nodes: TreeNode[]; slug: string; current: string | null; depth: number; dirty: Set<string> }) {
  return (
    <ul role={depth === 0 ? 'tree' : 'group'}>
      {nodes.map((n) => <TreeItem key={n.path} n={n} slug={slug} current={current} depth={depth} dirty={dirty} />)}
    </ul>
  )
}
function TreeItem({ n, slug, current, depth, dirty }: { n: TreeNode; slug: string; current: string | null; depth: number; dirty: Set<string> }) {
  const open0 = n.dir && (depth === 0 ? !n.name.startsWith('05') : !!current && current.startsWith(n.path + '/'))
  const [open, setOpen] = useState(open0)
  useEffect(() => { if (n.dir && current?.startsWith(n.path + '/')) setOpen(true) }, [current, n.dir, n.path])
  const style = { paddingLeft: 8 + depth * 14 }
  if (n.dir) {
    return (
      <li role="treeitem" aria-expanded={open}>
        <button className="tr-row dir" style={style} onClick={() => setOpen(!open)}>
          <Icon name="chevron" size={12} className={cx('chev', open && 'open')} /><Icon name="folder" size={15} /><span>{n.name}</span>
          <span className="dim small push">{n.children?.length ?? 0}</span>
        </button>
        {open && n.children && <TreeList nodes={n.children} slug={slug} current={current} depth={depth + 1} dirty={dirty} />}
      </li>
    )
  }
  return (
    <li role="treeitem" aria-selected={current === n.path}>
      <a className={cx('tr-row', current === n.path && 'on')} style={{ ...style, paddingLeft: 8 + depth * 14 + 16 }} href={href({ slug, view: 'files', file: n.path })}>
        <Icon name={iconFor(n)} size={15} /><span className="tr-name">{n.name}</span>
        {dirty.has(n.path) && <i className="dot" aria-label="Unsaved changes" />}
        <span className="dim small push mono">{fmtBytes(n.size)}</span>
      </a>
    </li>
  )
}

function FileViewer({ slug, path, info, characters }: { slug: string; path: string; info: Info | null; characters?: string[] }) {
  const kind = kindOf(path)
  const name = path.split('/').pop()!
  const crumbs = path.split('/')
  const head = (
    <div className="crumbs mono small">
      {crumbs.map((c, i) => <span key={i}>{i > 0 && <span className="dim"> / </span>}{c}</span>)}
    </div>
  )
  if (kind === 'json' || kind === 'text') return <div className="viewer-col">{head}<DocEditor slug={slug} path={path} info={info} characters={characters} /></div>
  if (kind === 'video') return <div className="viewer-col media">{head}<div className="video-wrap"><VideoPlayer src={fileUrl(slug, path)} /></div></div>
  if (kind === 'audio') return <div className="viewer-col media">{head}<div className="audio-wrap"><Icon name="audio" size={40} /><h3 className="mono">{name}</h3><AudioClip src={fileUrl(slug, path)} label={name} /></div></div>
  if (kind === 'image') return <div className="viewer-col media">{head}<div className="img-wrap"><img src={fileUrl(slug, path)} alt={name} /></div><a className="small" href={fileUrl(slug, path)} target="_blank" rel="noreferrer">Open full size</a></div>
  return <div className="viewer-col">{head}<Empty icon="file" title="No preview for this file type"><a href={fileUrl(slug, path)} download={name}>Download {name}</a></Empty></div>
}

