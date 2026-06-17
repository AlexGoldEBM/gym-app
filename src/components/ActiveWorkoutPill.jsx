import { useNavigate } from 'react-router-dom'
import { useWorkout } from '../store/WorkoutContext'
import { fmtClock } from '../lib/util'

// Persistent "resume workout" bar shown when a workout is in progress but you've navigated away.
export function ActiveWorkoutPill() {
  const { active, now } = useWorkout()
  const nav = useNavigate()
  if (!active) return null
  const elapsed = Math.floor((now - active.start_time) / 1000)
  const sets = active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)
  return (
    <button onClick={() => nav('/workout')}
      className="fixed inset-x-0 bottom-[58px] z-30 px-2"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto bg-accent text-white rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
        <span className="font-semibold truncate">{active.title}</span>
        <span className="text-white/80 text-sm font-mono ml-auto">{fmtClock(elapsed)}</span>
        <span className="text-white/80 text-sm">· {sets} sets</span>
        <span className="font-bold">Resume ›</span>
      </div>
    </button>
  )
}
