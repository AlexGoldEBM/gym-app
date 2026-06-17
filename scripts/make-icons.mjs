// Generates app icons (no external deps) — flat dark bg with a blue dumbbell glyph.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, '..', 'public')

const BG = [10, 10, 10]
const FG = [59, 130, 246]

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = []
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function drawDumbbell(size, px, py, maskable) {
  // returns true if pixel is foreground
  const cy = size / 2
  const inset = maskable ? size * 0.22 : size * 0.16
  const barH = size * 0.10
  const plateW = size * 0.10
  const plateTall = size * 0.34
  const plateTall2 = size * 0.24
  const innerPlateW = size * 0.07
  const left = inset, right = size - inset
  // center bar
  if (py > cy - barH / 2 && py < cy + barH / 2 && px > left && px < right) return true
  // outer plates
  for (const x0 of [left, right - plateW]) {
    if (px > x0 && px < x0 + plateW && py > cy - plateTall / 2 && py < cy + plateTall / 2) return true
  }
  // inner plates
  for (const x0 of [left + plateW + size * 0.02, right - plateW - innerPlateW - size * 0.02]) {
    if (px > x0 && px < x0 + innerPlateW && py > cy - plateTall2 / 2 && py < cy + plateTall2 / 2) return true
  }
  return false
}

function makePNG(size, maskable = false) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter byte
    for (let x = 0; x < size; x++) {
      const fg = drawDumbbell(size, x, y, maskable)
      const c = fg ? FG : BG
      raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2]; raw[p++] = 255
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

writeFileSync(join(PUB, 'icon-192.png'), makePNG(192))
writeFileSync(join(PUB, 'icon-512.png'), makePNG(512))
writeFileSync(join(PUB, 'icon-512-maskable.png'), makePNG(512, true))
writeFileSync(join(PUB, 'apple-touch-icon.png'), makePNG(180))

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0a"/><g fill="#3b82f6"><rect x="6" y="14" width="20" height="4"/><rect x="5" y="9" width="3" height="14"/><rect x="24" y="9" width="3" height="14"/><rect x="9" y="11" width="2.5" height="10"/><rect x="20.5" y="11" width="2.5" height="10"/></g></svg>`
writeFileSync(join(PUB, 'favicon.svg'), favicon)
console.log('icons generated')
