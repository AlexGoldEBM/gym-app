import { useMemo, useState } from 'react'
import { useData } from '../store/DataContext'
import { MiniLine } from '../components/Chart'
import { ExercisePicker } from '../components/ExercisePicker'
import { exerciseSeries, exercisePRs, setsForExercise } from '../lib/stats'
import { fmtWeight, fmtDuration } from '../lib/util'

const RANGES = [
  { label: '1M', days: 30 }, { label: '3M', days: 90 },
  { label: '6M', days: 182 }, { label: '1Y', days: 365 }, { label: 'All', days: null },
]
const METRICS = [
  { key: 'est1RM', label: 'Est. 1RM', unit: 'kg', color: '#3b82f6' },
  { key: 'topWeight', label: 'Top weight', unit: 'kg', color: '#22c55e' },
  { key: 'volume', label: 'Volume', unit: '', color: '#f59e0b' },
]

export default function Progress() {
  const { exercises, sessions, exerciseMap } = useData()
  const [picker, setPicker] = useState(false)
  const [range, setRange] = useState(90)
  const [metric, setMetric] = useState('est1RM')

  // default to most-logged exercise
  const defaultEx = useMemo(() => {
    const counts = {}
    for (const s of sessions) for (const set of s.sets || []) counts[set.exercise_id] = (counts[set.exercise_id] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top?.[0] || null
  }, [sessions])
  const [exId, setExId] = useState(null)
  const activeId = exId || defaultEx

  const ex = activeId ? exerciseMap[activeId] : null
  const isDuration = ex?.tracking_type === 'duration'
  const series = useMemo(() => {
    let s = exerciseSeries(sessions, activeId, ex?.tracking_type)
    if (range) { const cut = Date.now() - range * 86400000; s = s.filter(p => p.time >= cut) }
    return s
  }, [sessions, activeId, ex, range])
  const prs = useMemo(() => activeId ? exercisePRs(sessions, activeId, ex?.tracking_type) : null, [sessions, activeId, ex])
  const activeMetric = METRICS.find(m => m.key === metric)

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold mb-4">Progress</h1>

      <button className="card w-full p-3 flex items-center justify-between mb-3" onClick={() => setPicker(true)}>
        <div className="text-left">
          <div className="text-xs text-gray-500">Exercise</div>
          <div className="font-semibold">{ex?.name || 'Select an exercise'}</div>
        </div>
        <span className="text-accent text-sm">Change ›</span>
      </button>

      {!activeId ? (
        <p className="text-center text-gray-500 text-sm py-10">Log some workouts to see progress charts.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {isDuration ? (
              <PR label="Best hold" value={prs.bestDuration ? fmtDuration(prs.bestDuration) : '—'} />
            ) : (
              <>
                <PR label="Heaviest" value={prs.bestWeight ? `${fmtWeight(prs.bestWeight)}kg` : '—'} />
                <PR label="Est. 1RM" value={prs.best1RM ? `${Math.round(prs.best1RM)}kg` : '—'} />
                <PR label="Sets logged" value={prs.count} />
              </>
            )}
          </div>

          {!isDuration && (
            <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`chip shrink-0 ${metric === m.key ? 'bg-good text-bg border-good' : ''}`}>{m.label}</button>
              ))}
            </div>
          )}

          <div className="card p-3 mb-3">
            <MiniLine data={series} dataKey={isDuration ? 'bestDuration' : activeMetric.key}
              color={isDuration ? '#3b82f6' : activeMetric.color} unit={isDuration ? 's' : activeMetric.unit} />
          </div>

          <div className="flex gap-1.5 justify-center">
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r.days)}
                className={`chip ${range === r.days ? 'bg-royal text-white border-royal' : ''}`}>{r.label}</button>
            ))}
          </div>
        </>
      )}

      <ExercisePicker open={picker} multi={false} onClose={() => setPicker(false)}
        onPick={(id) => { setExId(id); setPicker(false) }} title="Choose exercise" />
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
