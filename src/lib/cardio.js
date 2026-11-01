// Cardio machines: which inputs each one shows, plus formatting. Edit CARDIO_MACHINES to change
// a machine's fields — everything else (logging, history, charts) reads from here.
import { fmtWeight } from './util'

export const CARDIO_FIELDS = {
  duration_seconds: { label: 'Time', unit: 'min' },
  distance_km: { label: 'Distance', unit: 'km' },
  // `short` labels the small second-row inputs, which are ~60px wide on a phone
  level: { label: 'Level', unit: '', short: 'Level' },
  incline_pct: { label: 'Incline', unit: '%', short: 'Incline %' },
  speed_kmh: { label: 'Speed', unit: 'km/h', short: 'km/h' },
  calories: { label: 'Cal', unit: 'kcal', short: 'kcal' },
  heart_rate: { label: 'Avg HR', unit: 'bpm', short: 'Avg HR' },
  watts: { label: 'Watts', unit: 'W', short: 'Watts' },
}

// Time + distance are always the top row; `extra` is the second row of smaller inputs.
export const CARDIO_MACHINES = {
  treadmill: { label: 'Treadmill', extra: ['incline_pct', 'speed_kmh', 'calories', 'heart_rate'] },
  bike: { label: 'Bike', extra: ['level', 'calories', 'heart_rate', 'watts'] },
  rower: { label: 'Rower', extra: ['level', 'calories', 'heart_rate'], metres: true },
  cross_trainer: { label: 'Cross trainer', extra: ['level', 'incline_pct', 'calories', 'heart_rate'] },
}

export function cardioMachine(exercise) {
  return CARDIO_MACHINES[exercise?.cardio_machine] || CARDIO_MACHINES.treadmill
}

// Rowers display metres; everything is stored as distance_km.
export function distanceUnit(exercise) {
  return cardioMachine(exercise).metres ? 'm' : 'km'
}
export function kmToInput(km, exercise) {
  if (km == null) return null
  return cardioMachine(exercise).metres ? Math.round(km * 1000) : Math.round(km * 100) / 100
}
export function inputToKm(v, exercise) {
  if (v == null) return null
  return cardioMachine(exercise).metres ? v / 1000 : v
}
export const secToMin = s => (s == null ? null : Math.round((s / 60) * 100) / 100)
export const minToSec = m => (m == null ? null : Math.round(m * 60))

export function fmtClockTime(sec) {
  if (sec == null) return '—'
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60)
  const mm = h ? String(m).padStart(2, '0') : m
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export function fmtDistance(km, exercise) {
  if (km == null) return '—'
  return cardioMachine(exercise).metres ? `${Math.round(km * 1000).toLocaleString()} m` : `${Math.round(km * 100) / 100} km`
}

// Average speed (km/h) or, for rowers, split time per 500 m (seconds).
export function avgSpeed(set) {
  if (!set.distance_km || !set.duration_seconds) return null
  return set.distance_km / (set.duration_seconds / 3600)
}
export function split500(set) {
  if (!set.distance_km || !set.duration_seconds) return null
  return set.duration_seconds / (set.distance_km * 2)
}
export function fmtPace(set, exercise) {
  if (cardioMachine(exercise).metres) {
    const s = split500(set)
    return s ? `${fmtClockTime(s)} /500m` : null
  }
  const v = avgSpeed(set)
  return v ? `${v.toFixed(1)} km/h avg` : null
}

// One-line summary: "30:00 · 1.98 km · 15% · 4.0 km/h"
export function fmtCardioSet(set, exercise, { short = false } = {}) {
  const parts = []
  if (set.duration_seconds != null) parts.push(fmtClockTime(set.duration_seconds))
  if (set.distance_km != null) parts.push(fmtDistance(set.distance_km, exercise))
  if (short) return parts.join(' · ') || '—'
  for (const k of cardioMachine(exercise).extra) {
    if (set[k] == null) continue
    const f = CARDIO_FIELDS[k]
    parts.push(k === 'level' ? `L${set[k]}` : `${fmtWeight(set[k])}${f.unit === '%' ? '%' : ` ${f.unit}`}`)
  }
  return parts.join(' · ') || '—'
}

// PR tiles for the exercise page / Progress: [{ label, value }]
export function cardioPRCells(prs, exercise) {
  const rower = cardioMachine(exercise).metres
  return [
    { label: 'Longest distance', value: prs?.bestDistance ? fmtDistance(prs.bestDistance, exercise) : '—' },
    { label: 'Longest time', value: prs?.bestDuration ? fmtClockTime(prs.bestDuration) : '—' },
    rower
      ? { label: 'Best /500m', value: prs?.bestSplit ? fmtClockTime(prs.bestSplit) : '—' }
      : { label: 'Fastest avg', value: prs?.bestSpeed ? `${prs.bestSpeed.toFixed(1)} km/h` : '—' },
  ]
}

// Chart metrics over exerciseSeries(…, 'cardio') points.
export function cardioMetrics(exercise) {
  return [
    { key: 'distance', label: 'Distance', unit: ' km', color: '#3b82f6' },
    { key: 'minutes', label: 'Time', unit: ' min', color: '#22c55e' },
    cardioMachine(exercise).metres
      ? { key: 'split', label: 'Split /500m', unit: ' s', color: '#f59e0b' }
      : { key: 'speed', label: 'Avg speed', unit: ' km/h', color: '#f59e0b' },
  ]
}
