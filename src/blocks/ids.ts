/** Slack generates 5-character block ids when an app doesn't send one; the clone derives a stable one (web kit ids.ts). */
export function kitBlockId(b: { block_id?: string }, i: number): string {
  if (b.block_id) return b.block_id
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let h = 0
  for (const c of JSON.stringify(b)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  let id = ''
  for (let k = 0; k < 5; k++) {
    id += chars[(h + i * 7 + k * 13) % chars.length]
    h = Math.floor(h / 3) + 17
  }
  return id
}
