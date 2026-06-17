import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useData } from '../store/DataContext'
import { Confirm } from '../components/ui'
import { sessionVolume, sessionDurationMin, newPRsInSession } from '../lib/stats'
import { fmtDateTime, fmtWeight, fmtDuration, ms, SET_TYPES } from '../lib/util'

export default function SessionDetail() {
  const { id } = useParams()
  const { sessions, exerciseMap, deleteSession } = useData()
  const nav = useNavigate()
  const [confirmDel, setConfirmDel] = useState(false)

  const session = sessions.find(s => s.id === id)
  const prSets = useMemo(() => session ? newPRsInSession(sessions, session) : [], [sessions, session])
  const prKeys = new Set(prSets.map(s => s.id))

  if (!session) {
    return <div className="px-4 pt-16 text-center text-gray-400">Session not found.
      <button className="btn-primary block mx-auto mt-4" onClick={() => nav('/history')}>Back</button></div>
  }

  // group sets by exercise, preserving first-seen order
  const groups = []
  const seen = new Map()
  for (const set of session.sets || []) {
    if (!seen.has(set.exercise_id)) { seen.set(set.exercise_id, groups.length); groups.push({ exercise_id: set.exercise_id, sets: [] }) }
    groups[seen.get(set.exercise_id)].sets.push(set)
  }

  const dur = sessionDurationMin(session)

  return (
    <div className="px-4 pt-3 pb-20">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => nav('/history')} className="text-gray-400 px-1 text-xl">‹</button>
        <h1 className="text-xl font-bold flex-1 truncate">{session.title}</h1>
        <button className="btn-danger py-1.5 px-3 text-sm" onClick={() => setConfirmDel(true)}>Delete</button>
      </div>

      <p className="text-sm text-gray-500 mb-1">{fmtDateTime(ms(session.start_time))}</p>
      <div className="flex gap-4 text-sm mb-4">
        <span><b>{Math.round(sessionVolume(session)).toLocaleString()}</b> <span className="text-gray-500">kg volume</span></span>
        {dur != null && <span><b>{dur}</b> <span className="text-gray-500">min</span></span>}
        <span><b>{(session.sets || []).length}</b> <span className="text-gray-500">sets</span></span>
      </div>
      {session.description && <p className="text-sm text-gray-400 mb-4 bg-surface2 rounded-lg p-2">{session.description}</p>}

      <div className="space-y-3">
        {groups.map(g => {
          const ex = exerciseMap[g.exercise_id]
          const isDuration = ex?.tracking_type === 'duration'
          const note = g.sets.find(s => s.notes)?.notes
          return (
            <div key={g.exercise_id} className="card p-3">
              <Link to={`/exercises/${g.exercise_id}`} className="font-semibold">{ex?.name || 'Unknown exercise'}</Link>
              {note && <p className="text-xs text-gray-500 italic mt-0.5">{note}</p>}
              <div className="mt-2 space-y-1">
                {g.sets.map((s, i) => {
                  const t = SET_TYPES.find(x => x.id === s.set_type)
                  return (
                    <div key={s.id || i} className="flex items-center gap-3 text-sm">
                      <span className={`w-6 text-center font-semibold ${s.set_type === 'warmup' ? 'text-warn' : 'text-gray-500'}`}>
                        {t?.short || (i + 1)}
                      </span>
                      <span className="flex-1">
                        {isDuration
                          ? fmtDuration(s.duration_seconds)
                          : <>{fmtWeight(s.weight_kg)} kg × {s.reps}</>}
                      </span>
                      {s.rpe != null && <span className="text-xs text-gray-500">RPE {s.rpe}</span>}
                      {prKeys.has(s.id) && <span className="chip bg-good/20 text-good border-good/30">PR</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Confirm open={confirmDel} title="Delete workout?" body="This permanently removes this session from your log."
        onConfirm={async () => { await deleteSession(id); nav('/history') }} onCancel={() => setConfirmDel(false)} />
    </div>
  )
}
