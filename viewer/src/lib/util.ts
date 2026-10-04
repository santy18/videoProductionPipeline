export const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB']
  let i = -1
  do { n /= 1024; i++ } while (n >= 1024 && i < u.length - 1)
  return `${n >= 100 ? n.toFixed(0) : n.toFixed(1)} ${u[i]}`
}
export const fmtTime = (s: number) => {
  if (!isFinite(s)) return '0:00.0'
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`
}
export const fmtAgo = (ms: number) => {
  const d = (Date.now() - ms) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)} min ago`
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`
  return `${Math.floor(d / 86400)} d ago`
}
export const extOf = (p: string) => (p.includes('.') ? p.slice(p.lastIndexOf('.') + 1).toLowerCase() : '')
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/** Minimal line diff (LCS) for the review-changes panel. */
export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string }
export function diffLines(a: string, b: string): DiffLine[] {
  const x = a.split('\n'), y = b.split('\n')
  const n = x.length, m = y.length
  if (n * m > 4_000_000) return [{ kind: 'same', text: '(file too large to diff)' }]
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffLine[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ kind: 'same', text: x[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ kind: 'del', text: x[i++] })
    else out.push({ kind: 'add', text: y[j++] })
  }
  while (i < n) out.push({ kind: 'del', text: x[i++] })
  while (j < m) out.push({ kind: 'add', text: y[j++] })
  return out
}
/** Collapse long unchanged runs, keep 2 lines of context. */
export function collapseDiff(lines: DiffLine[]): (DiffLine | { kind: 'gap'; count: number })[] {
  const keep = new Array(lines.length).fill(false)
  lines.forEach((l, i) => { if (l.kind !== 'same') for (let k = Math.max(0, i - 2); k <= Math.min(lines.length - 1, i + 2); k++) keep[k] = true })
  const out: (DiffLine | { kind: 'gap'; count: number })[] = []
  let gap = 0
  lines.forEach((l, i) => {
    if (keep[i]) { if (gap) { out.push({ kind: 'gap', count: gap }); gap = 0 } out.push(l) } else gap++
  })
  if (gap) out.push({ kind: 'gap', count: gap })
  return out
}

/** Copy text; falls back to a hidden textarea because the Clipboard API needs HTTPS (a phone on the LAN is plain http). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through */ }
  const ta = document.createElement('textarea')
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length)
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  ta.remove()
  return ok
}
