import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useData } from '../store/DataContext'
import { ExerciseFormModal } from '../components/ExerciseForm'
import { Confirm } from '../components/ui'
import { MiniLine } from '../components/Chart'
import { exercisePRs, exerciseSeries, setsForExercise } from '../lib/stats'
import { fmtWeight, fmtDuration, fmtDate, ms } from '../lib/util'

const METRICS = [
  { key: 'est1RM', label: 'Est. 1RM', unit: 'kg', color: '#3b82f6' },
  { key: 'topWeight', label: 'Top set', unit: 'kg', color: '#22c55e' },
  { key: 'volume', label: 'Volume', unit: '', color: '#f59e0b' },
]

export default function ExerciseDetail() {
  const { id } = useParams()
  const { exercises, sessions, archiveExercise, deleteExercise } = useData()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [metric, setMetric] = useState('est1RM')

  const ex = exercises.find(e => e.id === id)
  const isDuration = ex?.tracking_type === 'duration'
  const prs = useMemo(() => ex ? exercisePRs(sessions, id, ex.tracking_type) : null, [sessions, id, ex])
  const series = useMemo(() => exerciseSeries(sessions, id, ex?.tracking_type), [sessions, id, ex])
  const history = useMemo(() => {
    // group sets by session, latest first
    const map = new Map()
    for (const s of setsForExercise(sessions, id)) {
      let entry = map.get(s._session)
      if (!entry) { entry = { time: s._time, sets: [] }; map.set(s._session, entry) }
      entry.sets.push(s)
    }
    return [...map.values()].sort((a, b) => b.time - a.time)
  }, [sessions, id])

  if (!ex) {
    return <div className="px-4 pt-16 text-center text-gray-400">Exercise not found.
      <button className="btn-primary block mx-auto mt-4" onClick={() => nav('/exercises')}>Back</button></div>
  }
  const activeMetric = METRICS.find(m => m.key === metric)

  return (
    <div className="px-4 pt-3 pb-20">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => nav(-1)} className="text-gray-400 px-1 text-xl">‹</button>
        <h1 className="text-xl font-bold flex-1">{ex.name}</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4 pl-7">{ex.muscle_group} · {ex.equipment}{isDuration && ' · timed'}</p>

      {/* PRs */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {isDuration ? (
          <PR label="Best hold" value={prs.bestDuration ? fmtDuration(prs.bestDuration) : '—'} />
        ) : (
          <>
            <PR label="Heaviest" value={prs.bestWeight ? `${fmtWeight(prs.bestWeight)} kg` : '—'} />
            <PR label="Est. 1RM" value={prs.best1RM ? `${Math.round(prs.best1RM)} kg` : '—'} />
            <PR label="Best volume" value={prs.bestVolume ? `${Math.round(prs.bestVolume)}` : '—'} />
          </>
        )}
      </div>

      {/* chart */}
      {!isDuration && (
        <div className="card p-3 mb-5">
          <div className="flex gap-1.5 mb-2">
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`chip ${metric === m.key ? 'bg-good text-bg border-good' : ''}`}>{m.label}</button>
            ))}
          </div>
          <MiniLine data={series} dataKey={activeMetric.key} color={activeMetric.color} unit={activeMetric.unit} />
        </div>
      )}
      {isDuration && (
        <div className="card p-3 mb-5">
          <div className="text-xs text-gray-500 mb-1">Best hold over time</div>
          <MiniLine data={series} dataKey="bestDuration" color="#3b82f6" unit="s" />
        </div>
      )}

      {/* history */}
      <h2 className="font-semibold text-gray-300 mb-2">History</h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No logged sets yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={i} className="card p-3">
              <div className="text-xs text-gray-500 mb-1">{fmtDate(h.time)}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {h.sets.sort((a, b) => a.set_index - b.set_index).map((s, j) => (
                  <span key={j} className={s.set_type === 'warmup' ? 'text-gray-500' : ''}>
                    {isDuration ? fmtDuration(s.duration_seconds) : `${fmtWeight(s.weight_kg)}×${s.reps}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* manage */}
      <div className="mt-6 flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => setEdit(true)}>Edit</button>
        <button className="btn-ghost" onClick={() => archiveExercise(id, !ex.archived)}>
          {ex.archived ? 'Unarchive' : 'Archive'}
        </button>
        {ex.is_custom && <button className="btn-danger" onClick={() => setConfirmDel(true)}>Delete</button>}
      </div>
      {!ex.is_custom && (
        <p className="text-[11px] text-gray-600 mt-2">
          Seeded exercise — you can rename/recategorise it, but it can't be deleted (only archived) since past
          workouts reference it.
        </p>
      )}

      <ExerciseFormModal open={edit} onClose={() => setEdit(false)} editing={ex} />
      <Confirm open={confirmDel} title="Delete exercise?" body="Removes this custom exercise from the household library."
        onConfirm={async () => { await deleteExercise(id); nav('/exercises') }} onCancel={() => setConfirmDel(false)} />
    </div>
  )
}

function PR({ label, value }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
