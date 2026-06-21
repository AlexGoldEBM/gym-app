// Derived stats: PRs, per-exercise history, volume. All computed in-memory from the
// sessions snapshot (sets are embedded in each session doc) — no extra reads.
import { epley1RM, ms } from './util'

// Flatten all sets of an exercise across sessions, each annotated with its session time.
export function setsForExercise(sessions, exerciseId) {
  const out = []
  for (const s of sessions) {
    const t = ms(s.start_time)
    for (const set of s.sets || []) {
      if (set.exercise_id === exerciseId) out.push({ ...set, _time: t, _session: s.id })
    }
  }
  return out.sort((a, b) => a._time - b._time)
}

// Working sets only (exclude warmups) with real load.
function workingSets(sets) {
  return sets.filter(s => s.set_type !== 'warmup' && (s.weight_kg != null || s.duration_seconds != null))
}

export function exercisePRs(sessions, exerciseId, trackingType = 'weight_reps') {
  const sets = workingSets(setsForExercise(sessions, exerciseId))
  if (trackingType === 'duration') {
    let bestDuration = 0
    for (const s of sets) if ((s.duration_seconds || 0) > bestDuration) bestDuration = s.duration_seconds
    return { bestDuration, count: sets.length }
  }
  let bestWeight = 0, best1RM = 0, bestVolume = 0, bestReps = 0
  const perRep = {} // reps -> heaviest weight at that rep count
  for (const s of sets) {
    const w = s.weight_kg || 0, r = s.reps || 0
    if (w > bestWeight) bestWeight = w
    if (r > bestReps) bestReps = r
    const e = epley1RM(w, r)
    if (e > best1RM) best1RM = e
    const vol = w * r
    if (vol > bestVolume) bestVolume = vol
    if (r > 0 && w > (perRep[r] || 0)) perRep[r] = w
  }
  return { bestWeight, best1RM, bestVolume, bestReps, perRep, count: sets.length }
}

// Rep-max table: for each rep count 1..maxReps, the heaviest weight ever lifted at exactly
// that rep count (working sets only), plus its est 1RM and when. Used as "beatable targets".
export function repMaxTable(sessions, exerciseId, maxReps = 12) {
  const sets = workingSets(setsForExercise(sessions, exerciseId))
  const best = {} // reps -> { weight, time }
  for (const s of sets) {
    const w = s.weight_kg || 0, r = s.reps || 0
    if (r < 1 || r > maxReps || w <= 0) continue
    if (w > (best[r]?.weight || 0)) best[r] = { weight: w, time: s._time }
  }
  const rows = []
  for (let r = 1; r <= maxReps; r++) {
    const b = best[r]
    rows.push({ reps: r, weight: b?.weight || 0, est1RM: b ? epley1RM(b.weight, r) : 0, time: b?.time || null })
  }
  return rows
}

// Last N sessions that included this exercise, newest first, each with its sets.
export function recentSessions(sessions, exerciseId, n = 3) {
  const map = new Map()
  for (const s of setsForExercise(sessions, exerciseId)) {
    let e = map.get(s._session)
    if (!e) { e = { id: s._session, time: s._time, sets: [] }; map.set(s._session, e) }
    e.sets.push(s)
  }
  return [...map.values()]
    .sort((a, b) => b.time - a.time)
    .slice(0, n)
    .map(e => ({ ...e, sets: e.sets.sort((a, b) => a.set_index - b.set_index) }))
}

// Given live workout sets for one exercise + the historical best weight per rep count,
// return a Set of set keys that are a new rep-PR (heavier than ever logged at that rep count).
// Ties within the live workout resolve to the earliest set so only one cup shows per rep count.
export function livePRSetKeys(liveSets, histPerRep = {}) {
  const bestByReps = {} // reps -> { key, weight }
  for (const s of liveSets) {
    if (!s.done || s.set_type === 'warmup') continue
    const w = s.weight_kg || 0, r = s.reps || 0
    if (r < 1 || w <= 0) continue
    if (w <= (histPerRep[r] || 0)) continue // not above history
    const cur = bestByReps[r]
    if (!cur || w > cur.weight) bestByReps[r] = { key: s.key, weight: w }
  }
  return new Set(Object.values(bestByReps).map(v => v.key))
}

// Most recent session that included this exercise -> its sets (for "last time" display).
export function lastPerformance(sessions, exerciseId, excludeSessionId = null) {
  let best = null
  for (const s of sessions) {
    if (s.id === excludeSessionId) continue
    if (!(s.sets || []).some(set => set.exercise_id === exerciseId)) continue
    if (!best || ms(s.start_time) > ms(best.start_time)) best = s
  }
  if (!best) return null
  return {
    session: best,
    time: ms(best.start_time),
    sets: (best.sets || []).filter(set => set.exercise_id === exerciseId).sort((a, b) => a.set_index - b.set_index),
  }
}

// Per-session aggregates for charting one exercise over time.
export function exerciseSeries(sessions, exerciseId, trackingType = 'weight_reps') {
  const bySession = new Map()
  for (const s of sessions) {
    const sets = (s.sets || []).filter(set => set.exercise_id === exerciseId && set.set_type !== 'warmup')
    if (!sets.length) continue
    let topWeight = 0, volume = 0, best1RM = 0, bestDuration = 0
    for (const set of sets) {
      const w = set.weight_kg || 0, r = set.reps || 0
      if (w > topWeight) topWeight = w
      volume += w * r
      const e = epley1RM(w, r)
      if (e > best1RM) best1RM = e
      if ((set.duration_seconds || 0) > bestDuration) bestDuration = set.duration_seconds
    }
    bySession.set(s.id, {
      time: ms(s.start_time),
      date: new Date(ms(s.start_time)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      topWeight: Math.round(topWeight * 10) / 10,
      volume: Math.round(volume),
      est1RM: Math.round(best1RM * 10) / 10,
      bestDuration,
    })
  }
  return [...bySession.values()].sort((a, b) => a.time - b.time)
}

export function sessionVolume(session) {
  let v = 0
  for (const set of session.sets || []) {
    if (set.set_type === 'warmup') continue
    v += (set.weight_kg || 0) * (set.reps || 0)
  }
  return v
}

export function sessionDurationMin(session) {
  const a = ms(session.start_time), b = ms(session.end_time)
  if (!a || !b || b < a) return null
  return Math.round((b - a) / 60000)
}

// Detect which sets in a session are PRs *at the time they were logged* — used to badge them.
export function newPRsInSession(allSessions, session) {
  const prs = []
  for (const set of session.sets || []) {
    if (set.set_type === 'warmup' || !set.weight_kg || !set.reps) continue
    // best 1RM from all OTHER sessions before this one
    const priorSessions = allSessions.filter(s => s.id !== session.id && ms(s.start_time) <= ms(session.start_time))
    const prior = exercisePRs(priorSessions, set.exercise_id)
    if (epley1RM(set.weight_kg, set.reps) > (prior.best1RM || 0)) prs.push(set)
  }
  return prs
}
