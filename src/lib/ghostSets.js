// Build ghost-only (grey, non-committing) starter sets for a newly added exercise,
// seeded from the last time it was performed. Shared by routine start and mid-workout
// "Add exercise" so both paths behave the same way.
import { uid, pickSetValues, hasSetValue } from './util'
import { lastPerformance } from './stats'

export function seedGhostSets(sessions, exercise_id, { tracking = 'weight_reps', targetSets = 0, targetWeight = null } = {}) {
  const last = lastPerformance(sessions, exercise_id)
  const count = Math.max(targetSets || 0, last?.sets?.length || 0, 1)
  const sets = []
  for (let i = 0; i < count; i++) {
    const p = last?.sets?.[i]
    const ghost = tracking === 'cardio'
      ? (hasSetValue(p) ? pickSetValues(p) : null)
      : tracking === 'duration'
        ? (p?.duration_seconds != null ? { duration_seconds: p.duration_seconds } : null)
        : ((targetWeight != null || p?.weight_kg != null || p?.reps != null)
            ? { weight_kg: targetWeight ?? p?.weight_kg ?? null, reps: p?.reps ?? null }
            : null)
    sets.push({
      key: uid(),
      set_type: p?.set_type ?? 'normal',
      ...pickSetValues(null),
      rpe: null,
      done: false,
      ghost,
    })
  }
  return sets
}
