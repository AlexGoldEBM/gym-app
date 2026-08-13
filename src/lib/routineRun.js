import { uid } from './util'
import { seedGhostSets } from './ghostSets'

// Turn a routine into startWorkout() opts, pre-populating target sets and last-used weights
// as ghost (grey, non-committing) hints — nothing is written as a real value until logged.
export function startFromRoutine(routine, sessions, exerciseMap) {
  const exercises = (routine.exercises || []).map(re => {
    const ex = exerciseMap[re.exercise_id]
    const isDuration = ex?.tracking_type === 'duration'
    const targetSets = Math.max(1, re.target_sets || 1)
    const sets = seedGhostSets(sessions, re.exercise_id, {
      isDuration, targetSets, targetWeight: re.target_weight ?? null,
    })
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
