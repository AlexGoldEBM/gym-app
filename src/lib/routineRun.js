import { uid } from './util'
import { lastPerformance } from '../lib/stats'

// Turn a routine into startWorkout() opts, pre-populating target sets and last-used weights.
export function startFromRoutine(routine, sessions, exerciseMap) {
  const exercises = (routine.exercises || []).map(re => {
    const ex = exerciseMap[re.exercise_id]
    const isDuration = ex?.tracking_type === 'duration'
    const last = lastPerformance(sessions, re.exercise_id)
    const targetSets = Math.max(1, re.target_sets || 1)
    const sets = []
    for (let i = 0; i < targetSets; i++) {
      const prev = last?.sets?.[i]
      sets.push({
        key: uid(),
        set_type: 'normal',
        weight_kg: re.target_weight ?? prev?.weight_kg ?? null,
        reps: isDuration ? null : (prev?.reps ?? null),
        duration_seconds: isDuration ? (prev?.duration_seconds ?? null) : null,
        rpe: null,
        done: false,
      })
    }
    return {
      key: uid(),
      exercise_id: re.exercise_id,
      superset_id: re.superset_id || null,
      notes: re.notes || '',
      target_reps: re.target_reps || null,
      target_sets: targetSets,
      restSec: re.restSec ?? routine.restDefaultSec ?? 120,
      sets,
    }
  })
  return {
    title: routine.name,
    routine_id: routine.id,
    restDefaultSec: routine.restDefaultSec ?? 120,
    exercises,
  }
}
