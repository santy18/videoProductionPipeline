const cache = new Map<string, Promise<Float32Array | null>>()
let ctx: AudioContext | null = null

/** Decode an audio file and reduce it to `buckets` peak amplitudes (0..1). Cached by url+buckets. */
export function loadPeaks(url: string, buckets = 120): Promise<Float32Array | null> {
  const key = `${url}#${buckets}`
  const hit = cache.get(key)
  if (hit) return hit
  const p = (async () => {
    try {
      const buf = await (await fetch(url)).arrayBuffer()
      ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const audio = await ctx.decodeAudioData(buf)
      const ch = audio.getChannelData(0)
      const out = new Float32Array(buckets)
      const step = Math.max(1, Math.floor(ch.length / buckets))
      let max = 0
      for (let i = 0; i < buckets; i++) {
        let m = 0
        for (let k = i * step; k < Math.min(ch.length, (i + 1) * step); k++) { const v = Math.abs(ch[k]); if (v > m) m = v }
        out[i] = m; if (m > max) max = m
      }
      if (max > 0) for (let i = 0; i < buckets; i++) out[i] /= max
      return out
    } catch { return null }
  })()
  cache.set(key, p)
  return p
}
