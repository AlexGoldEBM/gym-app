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
  hair: '#1d2333',
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

// data: { title, dateLabel, durationLabel, volumeTitle, volumeLabel, records, userName, appName,
//         areas, regions, figure ('male' | 'female'), exercises: [{ name, sets, best }] }
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
  drawFigure(ctx, 'front', d.figure, d.regions, CARD_W / 2 - figW - 30, top, scale)
  drawFigure(ctx, 'back', d.figure, d.regions, CARD_W / 2 + 30, top, scale)
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
    { label: d.volumeTitle || 'Volume', value: d.volumeLabel },
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
// Anatomical-ish figures in a 200×440 box, in the style of a muscle chart: a skin silhouette with
// each muscle inset on top so the gaps read as definition lines. Paths are the figure's left half
// (viewer's left) and are mirrored. Region ids match REGIONS_OF in muscleSplit.js; muscles without
// a region stay unworked grey. The female figure is the same drawing reshaped by femaleWarp().

// Silhouette, split so arms and torso can be reshaped separately.
const SIL_BODY = 'M100,6 C88,6 80,15 80,30 C80,42 84,52 90,56 L90,64 C80,68 64,70 54,74 C44,78 38,88 38,100 ' +
  'L64,112 C64,130 66,150 72,170 C74,180 74,190 72,200 C68,210 64,220 62,232 C58,256 60,290 66,318 ' +
  'C68,328 68,336 68,344 C62,360 62,382 70,402 C71,408 72,412 72,414 C64,420 62,428 70,430 L92,430 ' +
  'C94,424 94,418 93,412 C96,392 98,372 96,352 C97,342 97,332 97,324 C99,300 100,270 100,240 Z'
const SIL_ARM = 'M56,74 C42,78 34,90 34,106 C31,122 30,140 30,156 C28,164 26,172 25,180 C23,196 24,210 28,224 ' +
  'C24,234 22,248 26,258 C30,264 37,264 39,256 C41,248 43,238 43,228 C45,214 49,198 52,180 ' +
  'C54,172 56,166 57,160 C60,148 63,134 65,120 C66,114 68,112 70,110 L70,80 Z'

const ARM_MUSCLES = {
  forearmOuter: 'M34,164 C28,174 26,188 26,204 C30,192 36,180 44,168 C41,164 38,162 34,164 Z',
  forearmInner: 'M46,167 C38,182 32,200 30,222 L41,222 C43,206 47,190 51,174 C50,170 48,167 46,167 Z',
}

const FRONT = [
  { region: 'traps', d: 'M91,62 C84,66 70,70 58,73 C70,76 82,74 92,70 Z' },
  { region: 'delts', d: 'M53,77 C42,81 36,92 36,106 C36,114 38,120 41,125 C43,108 47,94 55,82 Z' },
  { region: 'delts', d: 'M58,78 C52,88 48,102 46,123 C53,112 60,104 68,97 C71,90 68,82 58,78 Z' },
  { region: 'chest', d: 'M98,77 L70,77 C62,84 60,98 65,108 C70,116 80,121 92,121 C96,121 98,119 98,117 Z' },
  { region: 'obliques', d: 'M67,121 L77,124 L76,128 L67,126 Z' },
  { region: 'obliques', d: 'M67,130 L78,133 L77,137 L68,135 Z' },
  { region: 'obliques', d: 'M68,139 L79,142 L78,146 L69,144 Z' },
  { region: 'obliques', d: 'M84,148 C78,150 73,156 72,166 C73,180 74,192 76,204 L87,210 C85,190 84,172 84,148 Z' },
  { region: 'abs', d: 'M98,124 L88,124 C86,129 86,134 87,139 L98,139 Z' },
  { region: 'abs', d: 'M98,142 L87,142 C86,147 86,152 87,157 L98,157 Z' },
  { region: 'abs', d: 'M98,160 L87,160 C86,166 86,171 87,176 L98,176 Z' },
  { region: 'abs', d: 'M98,179 L87,179 C87,190 91,200 98,212 Z' },
  { region: 'biceps', arm: true, d: 'M63,116 C54,118 47,128 44,140 C42,150 43,157 47,161 C55,157 58,147 60,137 C62,128 63,122 63,116 Z' },
  { region: 'triceps', arm: true, d: 'M40,127 C34,136 32,146 32,155 C35,159 38,161 41,159 C40,148 40,138 42,129 Z' },
  { region: 'forearms', arm: true, d: ARM_MUSCLES.forearmOuter },
  { region: 'forearms', arm: true, d: ARM_MUSCLES.forearmInner },
  { region: 'quads', d: 'M65,232 C60,256 61,288 67,314 C73,302 76,284 76,262 C76,248 72,238 65,232 Z' },
  { region: 'quads', d: 'M78,222 C76,240 76,262 78,282 C80,296 83,306 86,314 C91,298 93,280 93,262 C93,244 89,230 78,222 Z' },
  { region: 'quads', d: 'M94,288 C89,296 87,306 89,317 C93,321 97,319 97,312 C97,300 96,292 94,288 Z' },
  { region: 'quads', d: 'M96,238 C93,248 94,264 95,282 C97,270 99,256 99,242 Z' },
  { region: 'calves', d: 'M67,349 C61,362 61,380 67,396 C73,386 75,370 75,353 Z' },
  { region: 'calves', d: 'M78,348 C78,364 80,382 82,400 L87,400 C88,380 87,362 85,348 Z' },
  { region: 'calves', d: 'M89,348 C96,358 97,374 95,392 C90,380 88,364 88,350 Z' },
]

const BACK = [
  { region: 'traps', d: 'M100,58 C96,62 92,65 88,67 C78,71 66,73 57,76 C70,80 80,86 86,96 C90,108 95,122 98,134 L100,134 Z' },
  { region: 'rearDelts', d: 'M54,78 C43,82 36,92 36,106 C36,114 38,120 41,125 C47,110 56,98 65,92 C63,84 60,80 54,78 Z' },
  { region: 'lats', d: 'M68,95 C62,101 61,108 62,114 C70,116 78,112 85,104 C81,99 75,95 68,95 Z' },
  { region: 'lats', d: 'M64,120 C66,140 69,162 75,186 C79,190 82,186 84,180 C87,166 92,150 94,140 C90,130 88,120 86,110 C80,117 72,121 64,120 Z' },
  { region: 'lowerBack', d: 'M98,138 C94,150 90,170 85,194 C82,200 90,207 98,208 Z' },
  { region: 'triceps', arm: true, d: 'M41,123 C34,134 31,148 32,160 L41,160 C41,148 44,134 48,121 Z' },
  { region: 'triceps', arm: true, d: 'M51,119 C48,132 45,146 45,161 C49,163 54,162 57,158 C61,146 64,130 65,119 C60,117 55,117 51,119 Z' },
  { region: 'forearms', arm: true, d: ARM_MUSCLES.forearmOuter },
  { region: 'forearms', arm: true, d: ARM_MUSCLES.forearmInner },
  { region: 'glutes', d: 'M73,203 C68,210 65,218 66,226 C74,220 84,212 93,208 C86,204 80,202 73,203 Z' },
  { region: 'glutes', d: 'M67,230 C62,244 65,256 76,262 C88,266 98,260 98,250 L98,213 C87,215 76,221 67,230 Z' },
  { region: 'hamstrings', d: 'M64,268 C60,286 62,302 69,320 C75,304 78,286 80,268 Z' },
  { region: 'hamstrings', d: 'M83,268 C83,288 85,304 90,320 C95,304 97,286 97,268 Z' },
  { region: 'calves', d: 'M68,346 C60,360 61,378 71,392 C77,384 81,368 83,348 Z' },
  { region: 'calves', d: 'M85,348 C86,366 88,382 93,390 C98,378 98,360 94,348 Z' },
  { region: 'calves', d: 'M74,393 C74,400 76,405 80,409 L89,409 C91,401 91,396 89,393 Z' },
]

const FEMALE = {
  chest: 'M98,80 L72,80 C64,88 63,102 68,112 C74,122 88,126 98,121 Z',
  hairFront: 'M100,4 C86,4 76,14 76,30 C76,40 77,50 80,58 C81,44 84,24 100,20 Z',
  hairBack: 'M100,4 C86,4 76,14 76,30 C76,42 78,52 82,60 L100,62 Z',
}

// Torso/leg width multiplier by height: narrower shoulders and waist, wider hips and thighs.
const FEMALE_WIDTH = [[0, 0.96], [60, 0.96], [80, 0.9], [130, 0.9], [175, 0.84], [225, 1.04], [280, 1.02], [340, 0.94], [440, 0.92]]

function femaleWarp(d, arm) {
  return d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, xs, ys) => {
    const x = +xs, y = +ys
    let s = 0.86 // arms: pulled in with the shoulders and slimmed a touch
    if (!arm) {
      const i = FEMALE_WIDTH.findIndex(([py]) => py >= y)
      const [y0, s0] = FEMALE_WIDTH[Math.max(0, i - 1)], [y1, s1] = FEMALE_WIDTH[Math.max(0, i)]
      s = y1 === y0 ? s1 : s0 + (s1 - s0) * (y - y0) / (y1 - y0)
    }
    return `${Math.round((100 + (x - 100) * s) * 10) / 10},${y}`
  })
}

const FIGURES = {}
function figureParts(view, figure) {
  const key = `${view}-${figure}`
  if (FIGURES[key]) return FIGURES[key]
  const female = figure === 'female'
  let muscles = view === 'back' ? BACK : FRONT
  const parts = [{ fill: 'skin', d: SIL_BODY }, { fill: 'skin', arm: true, d: SIL_ARM }]
  if (female) muscles = muscles.map(m => m.region === 'chest' ? { ...m, d: FEMALE.chest } : m)
  parts.push(...muscles.map(m => ({ fill: 'muscle', ...m })))
  if (female) parts.push({ fill: 'hair', d: view === 'back' ? FEMALE.hairBack : FEMALE.hairFront })
  return (FIGURES[key] = parts.map(p => ({ ...p, path: new Path2D(female && p.fill !== 'hair' ? femaleWarp(p.d, p.arm) : p.d) })))
}

function drawFigure(ctx, view, figure, regions, x, y, scale) {
  for (const p of figureParts(view, figure)) {
    ctx.fillStyle = p.fill === 'skin' ? C.bodySkin : p.fill === 'hair' ? C.hair : muscleColor(regions?.[p.region] || 0)
    for (const mirror of [false, true]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      if (mirror) { ctx.translate(200, 0); ctx.scale(-1, 1) }
      ctx.fill(p.path)
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
