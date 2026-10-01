// TrueType/OpenType → WOFF 1.0 (W3C, https://www.w3.org/TR/WOFF/): each sfnt table zlib-compressed when that makes
// it smaller. Lossless (the browser gets the exact font back), dependency-free, and about half the size of the TTF.

import zlib from 'node:zlib'

const align4 = (n) => (n + 3) & ~3

export function ttfToWoff(ttf) {
  const flavor = ttf.readUInt32BE(0)
  const numTables = ttf.readUInt16BE(4)
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const at = 12 + 16 * i
    const tag = ttf.toString('latin1', at, at + 4)
    const checksum = ttf.readUInt32BE(at + 4)
    const offset = ttf.readUInt32BE(at + 8)
    const length = ttf.readUInt32BE(at + 12)
    const data = ttf.subarray(offset, offset + length)
    const deflated = zlib.deflateSync(data, { level: 9 })
    tables.push({ tag, checksum, origLength: length, data: deflated.length < length ? deflated : data })
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))

  const headerSize = 44 + 20 * numTables
  let size = headerSize
  for (const t of tables) size = align4(size) + t.data.length
  size = align4(size)
  const totalSfntSize = 12 + 16 * numTables + tables.reduce((s, t) => s + align4(t.origLength), 0)

  const out = Buffer.alloc(size)
  out.writeUInt32BE(0x774f4646, 0) // 'wOFF'
  out.writeUInt32BE(flavor, 4)
  out.writeUInt32BE(size, 8)
  out.writeUInt16BE(numTables, 12)
  out.writeUInt16BE(0, 14)
  out.writeUInt32BE(totalSfntSize, 16)
  out.writeUInt16BE(1, 20) // font version, informational
  out.writeUInt16BE(0, 22)
  // metadata and private blocks: none (offsets and lengths stay 0)

  let offset = headerSize
  tables.forEach((t, i) => {
    offset = align4(offset)
    const at = 44 + 20 * i
    out.write(t.tag, at, 4, 'latin1')
    out.writeUInt32BE(offset, at + 4)
    out.writeUInt32BE(t.data.length, at + 8)
    out.writeUInt32BE(t.origLength, at + 12)
    out.writeUInt32BE(t.checksum, at + 16)
    t.data.copy(out, offset)
    offset += t.data.length
  })
  return out
}
