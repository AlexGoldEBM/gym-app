import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useData } from '../store/DataContext'
import { useWorkout } from '../store/WorkoutContext'
import { sessionVolume, sessionDurationMin } from '../lib/stats'
import { relativeDay, ms, uid } from '../lib/util'
import { startFromRoutine } from '../lib/routineRun'

export default function Home() {
  const { profile, household } = useAuth()
  const { sessions, routines, exerciseMap } = useData()
  const { active, startWorkout } = useWorkout()
  const nav = useNavigate()

  const weekAgo = Date.now() - 7 * 86400000
  const weekSessions = sessions.filter(s => ms(s.start_time) >= weekAgo)
  const weekVol = weekSessions.reduce((v, s) => v + sessionVolume(s), 0)

  function startEmpty() {
    if (active) { nav('/workout'); return }
    startWorkout({ title: 'Quick Workout' })
    nav('/workout')
  }
  function runRoutine(r) {
    if (active) { nav('/workout'); return }
    startWorkout(startFromRoutine(r, sessions, exerciseMap))
    nav('/workout')
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Hi {profile?.displayName?.split(' ')[0]}</h1>
          <p className="text-xs text-gray-500">{household?.name}</p>
        </div>
        <Link to="/settings" className="h-9 w-9 grid place-items-center rounded-full bg-surface2 text-lg">⚙️</Link>
      </div>

      {/* week stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Workouts" value={weekSessions.length} sub="this week" />
        <Stat label="Volume" value={`${Math.round(weekVol / 1000)}k`} sub="kg this week" />
        <Stat label="Total" value={sessions.length} sub="all time" />
      </div>

      <button className="btn-primary w-full py-4 text-base mb-3" onClick={startEmpty}>
        {active ? '▶ Resume workout' : '+ Start empty workout'}
      </button>

      {/* routines quick-start */}
      <div className="flex items-center justify-between mb-2 mt-5">
        <h2 className="font-semibold text-gray-300">Start a routine</h2>
        <Link to="/routines" className="text-accent text-sm">Manage</Link>
      </div>
      {routines.length === 0 ? (
        <Link to="/routines" className="card block p-4 text-center text-gray-400 text-sm">
          No routines yet — tap to create one
        </Link>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {routines.map(r => (
            <button key={r.id} onClick={() => runRoutine(r)}
              className="card p-3 text-left shrink-0 w-44 active:scale-[0.98]">
              <div className="font-semibold truncate">{r.name}</div>
              <div className="text-xs text-gray-500 mt-1">{r.exercises?.length || 0} exercises</div>
              <div className="text-accent text-sm font-medium mt-2">Start ›</div>
            </button>
          ))}
        </div>
      )}

      {/* recent history */}
      <div className="flex items-center justify-between mb-2 mt-6">
        <h2 className="font-semibold text-gray-300">Recent</h2>
        <Link to="/history" className="text-accent text-sm">All history</Link>
      </div>
      <div className="space-y-2">
        {sessions.slice(0, 4).map(s => {
          const exCount = new Set((s.sets || []).map(x => x.exercise_id)).size
          return (
            <Link key={s.id} to={`/history/${s.id}`} className="card flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-xs text-gray-500">
                  {relativeDay(ms(s.start_time))} · {exCount} exercises · {(s.sets || []).length} sets
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{Math.round(sessionVolume(s)).toLocaleString()}<span className="text-gray-500 text-xs"> kg</span></div>
                {sessionDurationMin(s) != null && <div className="text-xs text-gray-500">{sessionDurationMin(s)} min</div>}
              </div>
            </Link>
          )
        })}
        {sessions.length === 0 && (
          <div className="card p-6 text-center text-gray-500 text-sm">No workouts logged yet. Start one above 💪</div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="card p-3">
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
      <div className="text-[10px] text-gray-600">{sub}</div>
    </div>
  )
}
