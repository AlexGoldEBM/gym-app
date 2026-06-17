// id + formatting + small helpers shared across the app

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function slugId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function inviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return c
}

// Epley estimated 1RM
export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function fmtWeight(kg) {
  if (kg == null) return '—'
  return Number.isInteger(kg) ? `${kg}` : kg.toFixed(1)
}

export function fmtDuration(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtClock(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.max(0, sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtDate(ts) {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(ts) {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function relativeDay(ts) {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function ms(ts) {
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (ts.toMillis) return ts.toMillis() // Firestore Timestamp
  if (ts instanceof Date) return ts.getTime()
  return new Date(ts).getTime()
}

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps',
  'Core', 'Hamstrings', 'Glutes', 'Lower Back', 'Full Body',
]

export const EQUIPMENT = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight',
  'Kettlebell', 'Assisted', 'TRX', 'Weighted',
]

export const SET_TYPES = [
  { id: 'normal', label: 'Normal', short: '' },
  { id: 'warmup', label: 'Warmup', short: 'W' },
  { id: 'failure', label: 'Failure', short: 'F' },
  { id: 'drop_set', label: 'Drop set', short: 'D' },
]
