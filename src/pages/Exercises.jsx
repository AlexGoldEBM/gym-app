import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { ExerciseFormModal } from '../components/ExerciseForm'
import { MUSCLE_GROUPS } from '../lib/util'

export default function Exercises() {
  const { exercises } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [mg, setMg] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [create, setCreate] = useState(false)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return exercises
      .filter(e => showArchived ? e.archived : !e.archived)
      .filter(e => (!mg || e.muscle_group === mg) && (!needle || e.name.toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, q, mg, showArchived])

  const archivedCount = exercises.filter(e => e.archived).length

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <button className="btn-primary py-2 px-3 text-sm" onClick={() => setCreate(true)}>+ New</button>
      </div>

      <input className="input w-full mb-2" placeholder="Search exercises…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
        <button onClick={() => setMg(null)} className={`chip shrink-0 ${!mg ? 'bg-royal text-white border-royal' : ''}`}>All</button>
        {MUSCLE_GROUPS.map(g => (
          <button key={g} onClick={() => setMg(mg === g ? null : g)}
            className={`chip shrink-0 ${mg === g ? 'bg-royal text-white border-royal' : ''}`}>{g}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{list.length} exercises</span>
        {archivedCount > 0 && (
          <button className="text-xs text-accent" onClick={() => setShowArchived(s => !s)}>
            {showArchived ? '← Active' : `Archived (${archivedCount})`}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {list.map(e => (
          <button key={e.id} onClick={() => nav(`/exercises/${e.id}`)}
            className="card w-full flex items-center gap-3 p-3 text-left">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{e.name}</div>
              <div className="text-xs text-gray-500">
                {e.muscle_group} · {e.equipment}{e.tracking_type === 'duration' && ' · timed'}
                {e.is_custom && <span className="text-accent ml-1">custom</span>}
              </div>
            </div>
            <span className="text-gray-600">›</span>
          </button>
        ))}
      </div>

      <ExerciseFormModal open={create} onClose={() => setCreate(false)} />
    </div>
  )
}
