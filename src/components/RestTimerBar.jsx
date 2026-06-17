import { useWorkout } from '../store/WorkoutContext'
import { fmtClock } from '../lib/util'

// Floating rest countdown shown above the bottom nav whenever a rest timer is live.
export function RestTimerBar() {
  const { rest, restRemaining, addRest, skipRest, startRest } = useWorkout()
  if (!rest) return null
  const pct = Math.max(0, Math.min(100, (restRemaining / rest.duration) * 100))
  return (
    <div className="fixed inset-x-0 bottom-[58px] z-40 px-2"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto card bg-surface2 border-accent/40 overflow-hidden shadow-lg">
        <div className="h-1 bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-gray-400 shrink-0">Rest</span>
          <span className="font-mono font-bold text-xl tabular-nums w-16">{fmtClock(restRemaining)}</span>
          <button className="btn-ghost py-1.5 px-3 text-sm" onClick={() => addRest(-15)}>−15</button>
          <button className="btn-ghost py-1.5 px-3 text-sm" onClick={() => addRest(15)}>+15</button>
          <button className="btn-primary py-1.5 px-3 text-sm ml-auto" onClick={skipRest}>Skip</button>
        </div>
      </div>
    </div>
  )
}
