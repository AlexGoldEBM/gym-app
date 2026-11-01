// Workout share images, drawn straight onto a <canvas> so the preview is exactly the PNG that
// gets saved (no DOM-to-image step, no extra dependency). Pure drawing — callers pass in data.
import { SPLIT_AREAS } from './muscleSplit'

export const CARD_W = 1080
export const CARD_H = 1350 // 4:5, fits Instagram feed + stories without cropping

const FONT = '"Plus Jakarta Sans", system-ui, sans-serif'
const C = {
  bg: '#050a1a',
  panel: '#0b1430',
  border: '#1c2a52',
  text: '#ffffff',
  muted: '#9aa6c4',
  grid: '#33405f',
  blue: '#3b82f6',
  blueFill: 'rgba(37, 99, 235, 0.35)',
  gold: '#facc15',
  bodyBase: '#2a3144',
  bodySkin: '#454c5e',
}

export const CARDS = [
  { id: 'split', label: 'Muscle split' },
  { id: 'body', label: 'Muscles worked' },
  { id: 'exercises', label: 'Exercises' },
]

// Load the weights we draw with before the first paint, or the canvas silently uses a fallback font.
export function loadCardFonts() {
  if (!document.fonts?.load) return Promise.resolve()
  return Promise.all([500, 700, 800].map(w => document.fonts.load(`${w} 40px "Plus Jakarta Sans"`))).catch(() => {})
}

// data: { title, dateLabel, durationLabel, volumeLabel, records, userName, appName,
//         areas, regions, exercises: [{ name, sets, best }] }
export function drawCard(canvas, id, data) {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  roundRect(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 56)
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = C.border
  ctx.stroke()

  if (id === 'split') drawSplit(ctx, data)
  else if (id === 'body') drawBody(ctx, data)
  else drawExercises(ctx, data)
  drawFooter(ctx, data)
}

export function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

// ---------- cards ----------

function drawSplit(ctx, d) {
  drawStats(ctx, d, 190)
  drawRadar(ctx, d.areas, CARD_W / 2, 700, 260)
}

function drawBody(ctx, d) {
  drawTitle(ctx, d, 200)
  const scale = 1.55, figW = 200 * scale, top = 290
  drawFigure(ctx, FRONT, d.regions, CARD_W / 2 - figW - 30, top, scale)
  drawFigure(ctx, BACK, d.regions, CARD_W / 2 + 30, top, scale)
  drawStats(ctx, d, 1060)
}

function drawExercises(ctx, d) {
  drawTitle(ctx, d, 200)
  const rows = d.exercises
  const maxRows = 9
  const shown = rows.length > maxRows ? rows.slice(0, maxRows - 1) : rows
  const lines = shown.length + (shown.length < rows.length ? 1 : 0)
  let y = Math.max(340, 660 - (lines - 1) * 35) // centre the list between title and stats
  const left = 120, right = CARD_W - 120
  for (const r of shown) {
    ctx.textAlign = 'left'
    ctx.fillStyle = C.blue
    ctx.font = `800 36px ${FONT}`
    const n = `${r.sets}×`
    ctx.fillText(n, left, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = C.muted
    ctx.font = `500 32px ${FONT}`
    ctx.fillText(r.best || '', right, y)
    const bestW = ctx.measureText(r.best || '').width
    ctx.textAlign = 'left'
    ctx.fillStyle = C.text
    ctx.font = `700 36px ${FONT}`
    ctx.fillText(fit(ctx, r.name, right - bestW - 30 - (left + 90)), left + 90, y)
    y += 70
  }
  if (shown.length < rows.length) {
    ctx.textAlign = 'left'
    ctx.fillStyle = C.muted
    ctx.font = `500 32px ${FONT}`
    ctx.fillText(`+ ${rows.length - shown.length} more`, left + 90, y)
  }
  drawStats(ctx, d, 1060)
}

// ---------- pieces ----------

function drawTitle(ctx, d, y) {
  ctx.textAlign = 'center'
  ctx.fillStyle = C.text
  ctx.font = `800 64px ${FONT}`
  ctx.fillText(fit(ctx, d.title, CARD_W - 200), CARD_W / 2, y)
  if (d.dateLabel) {
    ctx.fillStyle = C.muted
    ctx.font = `500 32px ${FONT}`
    ctx.fillText(d.dateLabel, CARD_W / 2, y + 52)
  }
}

function drawStats(ctx, d, y) {
  const cols = [
    { label: 'Duration', value: d.durationLabel },
    { label: 'Volume', value: d.volumeLabel },
    { label: 'Records', value: String(d.records), medal: d.records > 0 },
  ]
  const colW = (CARD_W - 160) / 3
  cols.forEach((c, i) => {
    const cx = 80 + colW * i + colW / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = C.muted
    ctx.font = `500 38px ${FONT}`
    ctx.fillText(c.label, cx, y)
    ctx.fillStyle = C.text
    ctx.font = `800 54px ${FONT}`
    if (c.medal) {
      const w = ctx.measureText(c.value).width
      ctx.fillText(c.value, cx - 30, y + 70)
      drawMedal(ctx, cx - 30 + w / 2 + 40, y + 48)
    } else {
      ctx.fillText(fit(ctx, c.value, colW - 10), cx, y + 70)
    }
  })
}

function drawMedal(ctx, x, y) {
  ctx.fillStyle = '#d97706'
  ctx.beginPath()
  ctx.moveTo(x - 16, y + 4); ctx.lineTo(x - 24, y + 34); ctx.lineTo(x - 10, y + 28); ctx.lineTo(x - 4, y + 40); ctx.lineTo(x + 2, y + 8)
  ctx.moveTo(x + 16, y + 4); ctx.lineTo(x + 24, y + 34); ctx.lineTo(x + 10, y + 28); ctx.lineTo(x + 4, y + 40); ctx.lineTo(x - 2, y + 8)
  ctx.fill()
  ctx.fillStyle = C.gold
  ctx.beginPath()
  ctx.arc(x, y - 6, 20, 0, Math.PI * 2)
  ctx.fill()
}

function drawFooter(ctx, d) {
  const y = CARD_H - 110
  ctx.textAlign = 'left'
  ctx.fillStyle = C.text
  ctx.font = `800 44px ${FONT}`
  ctx.fillText(d.appName.toUpperCase(), 110, y)
  ctx.textAlign = 'right'
  ctx.font = `500 40px ${FONT}`
  ctx.fillText(fit(ctx, d.userName || '', CARD_W / 2 - 120), CARD_W - 110, y)
}

// Polar "rose": one wedge per area, radius proportional to its share of sets.
function drawRadar(ctx, areas, cx, cy, R) {
  const step = (Math.PI * 2) / SPLIT_AREAS.length
  const angleOf = i => -2 * Math.PI / 3 + i * step // Back sits top-left, then clockwise
  const max = Math.max(...SPLIT_AREAS.map(a => areas[a] || 0))

  ctx.strokeStyle = C.grid
  ctx.lineWidth = 2
  SPLIT_AREAS.forEach((a, i) => {
    const t = angleOf(i)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R)
    ctx.stroke()
    ctx.fillStyle = C.muted
    ctx.font = `500 38px ${FONT}`
    ctx.textAlign = Math.abs(Math.cos(t)) < 0.1 ? 'center' : Math.cos(t) > 0 ? (Math.abs(Math.sin(t)) > 0.5 ? 'center' : 'left') : (Math.abs(Math.sin(t)) > 0.5 ? 'center' : 'right')
    const lr = R + (Math.abs(Math.sin(t)) > 0.5 ? 55 : 30)
    ctx.fillText(a, cx + Math.cos(t) * lr, cy + Math.sin(t) * lr + 14)
  })

  if (!max) return
  const half = step * 0.42
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  SPLIT_AREAS.forEach((a, i) => {
    const v = areas[a] || 0
    if (!v) return
    const r = Math.max(R * 0.08, R * (v / max))
    const t = angleOf(i)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, t - half, t + half)
    ctx.closePath()
    ctx.fillStyle = C.blueFill
    ctx.fill()
    ctx.strokeStyle = C.blue
    ctx.stroke()
  })
}

// ---------- body map ----------
// Stylised figures in a 200×440 box. Paths are the figure's left half (viewer's left) and are
// mirrored unless `center` is set. Region ids match REGIONS_OF in muscleSplit.js.

const SKIN = {
  head: 'M100,6 C86,6 78,18 78,32 C78,48 88,58 100,58 C112,58 122,48 122,32 C122,18 114,6 100,6 Z',
  neck: 'M90,54 L110,54 L112,70 L88,70 Z',
  hands: 'M38,220 C34,232 38,246 46,246 C54,246 56,232 52,220 Z',
  hip: 'M78,200 L122,200 L124,216 L100,232 L76,216 Z',
  knee: 'M74,312 L97,312 L95,326 L76,326 Z',
  feet: 'M76,402 L92,402 L94,420 C94,428 70,428 70,420 Z',
}

const FRONT = [
  ...skinParts(),
  { region: 'traps', d: 'M88,62 L66,76 L88,74 Z' },
  { region: 'delts', d: 'M66,74 C50,76 44,92 46,110 C54,104 62,98 70,96 C74,88 74,80 66,74 Z' },
  { region: 'chest', d: 'M99,76 L80,76 C70,80 68,96 72,112 C82,122 94,122 99,116 Z' },
  { region: 'abs', center: true, d: 'M88,124 L112,124 C114,150 114,176 112,200 L88,200 C86,176 86,150 88,124 Z' },
  { region: 'obliques', d: 'M85,122 L74,116 C68,142 70,176 78,200 L86,200 C84,174 84,148 85,122 Z' },
  { region: 'biceps', d: 'M47,112 C42,128 42,142 46,154 L60,154 C64,138 66,122 68,100 C60,102 52,106 47,112 Z' },
  { region: 'forearms', d: 'M45,158 C38,178 36,198 38,218 L52,218 C58,198 62,178 60,158 Z' },
  { region: 'quads', d: 'M77,214 C66,246 66,282 74,310 L97,310 C100,282 100,250 98,232 L78,212 Z' },
  { region: 'calves', d: 'M75,328 C68,352 70,380 77,400 L91,400 C96,378 96,350 94,328 Z' },
]

const BACK = [
  ...skinParts(),
  { region: 'lats', d: 'M72,86 C64,120 70,150 84,174 L100,172 L100,104 Z' },
  { region: 'traps', center: true, d: 'M100,56 L68,76 L84,92 L100,132 L116,92 L132,76 Z' },
  { region: 'rearDelts', d: 'M66,74 C50,76 44,92 46,110 C54,104 62,98 70,96 C74,88 74,80 66,74 Z' },
  { region: 'lowerBack', center: true, d: 'M86,170 L114,170 L118,202 L82,202 Z' },
  { region: 'triceps', d: 'M47,112 C42,128 42,142 46,154 L60,154 C64,138 66,122 68,100 C60,102 52,106 47,112 Z' },
  { region: 'forearms', d: 'M45,158 C38,178 36,198 38,218 L52,218 C58,198 62,178 60,158 Z' },
  { region: 'glutes', d: 'M80,204 C72,224 74,244 86,252 C94,254 99,248 99,240 L99,204 Z' },
  { region: 'hamstrings', d: 'M78,256 C70,276 70,296 74,310 L97,310 C100,292 100,272 98,256 Z' },
  { region: 'calves', d: 'M75,328 C64,350 68,376 78,392 C86,400 92,396 93,384 C96,362 96,344 94,328 Z' },
]

function skinParts() {
  return [
    { skin: true, center: true, d: SKIN.head },
    { skin: true, center: true, d: SKIN.neck },
    { skin: true, center: true, d: SKIN.hip },
    { skin: true, d: SKIN.hands },
    { skin: true, d: SKIN.knee },
    { skin: true, d: SKIN.feet },
  ]
}

function drawFigure(ctx, parts, regions, x, y, scale) {
  for (const p of parts) {
    const path = new Path2D(p.d)
    ctx.fillStyle = p.skin ? C.bodySkin : muscleColor(regions?.[p.region] || 0)
    for (const mirror of p.center ? [false] : [false, true]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      if (mirror) { ctx.translate(200, 0); ctx.scale(-1, 1) }
      ctx.fill(path)
      ctx.restore()
    }
  }
}

// 0 -> unworked grey; anything worked starts deep blue and brightens with intensity.
function muscleColor(t) {
  if (t <= 0) return C.bodyBase
  const k = Math.min(1, t)
  const from = [30, 58, 138], to = [96, 165, 250]
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * k))
  return `rgb(${c.join(',')})`
}

// ---------- utils ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Truncate with an ellipsis to fit maxW at the current font.
function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s.trimEnd() + '…'
}
