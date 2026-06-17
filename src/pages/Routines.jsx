import { useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useWorkout } from '../store/WorkoutContext'
import { EmptyState } from '../components/ui'
import { startFromRoutine } from '../lib/routineRun'

export default function Routines() {
  const { routines, exerciseMap, sessions } = useData()
  const { active, startWorkout } = useWorkout()
  const nav = useNavigate()

  function run(r) {
    if (active) { nav('/workout'); return }
    startWorkout(startFromRoutine(r, sessions, exerciseMap))
    nav('/workout')
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Routines</h1>
        <button className="btn-primary py-2 px-3 text-sm" onClick={() => nav('/routines/new')}>+ New</button>
      </div>

      {routines.length === 0 ? (
        <EmptyState icon="📋" title="No routines yet"
          subtitle="Build a reusable workout template — exercises, target sets & reps, supersets. Shared with your household."
          action={<button className="btn-primary" onClick={() => nav('/routines/new')}>Create routine</button>} />
      ) : (
        <div className="space-y-2">
          {routines.map(r => (
            <div key={r.id} className="card p-3">
              <div className="flex items-center gap-2">
                <button className="flex-1 min-w-0 text-left" onClick={() => nav(`/routines/${r.id}`)}>
                  <div className="font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {(r.exercises || []).length} exercises ·{' '}
                    {(r.exercises || []).slice(0, 3).map(e => exerciseMap[e.exercise_id]?.name?.split(' (')[0]).filter(Boolean).join(', ')}
                    {(r.exercises || []).length > 3 ? '…' : ''}
                  </div>
                </button>
                <button className="btn-primary py-2 px-4 text-sm shrink-0" onClick={() => run(r)}>Start</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
