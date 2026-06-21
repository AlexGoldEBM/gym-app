import { useMemo, useState } from 'react'
import { Modal } from './ui'
import { useData } from '../store/DataContext'
import { MUSCLE_GROUPS, EQUIPMENT } from '../lib/util'
import { ExerciseFormModal } from './ExerciseForm'

// Picker modal. onPick(ids[]) when multi, else onPick(id). Supports multi-select for batch add.
export function ExercisePicker({ open, onClose, onPick, multi = true, title = 'Add exercise' }) {
  const { activeExercises, exerciseMap } = useData()
  const [q, setQ] = useState('')
  const [mg, setMg] = useState(null)
  const [selected, setSelected] = useState([])
  const [showCustom, setShowCustom] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return activeExercises
      .filter(e => (!mg || e.muscle_group === mg) && (!needle || e.name.toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeExercises, q, mg])

  function toggle(id) {
    if (!multi) { onPick(id); reset(); return }
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }
  function reset() { setQ(''); setMg(null); setSelected([]) }
  function confirm() { if (selected.length) onPick(selected); reset() }

  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose() }} title={title} full>
        <div className="flex flex-col h-full">
          <input autoFocus className="input w-full mb-2" placeholder="Search exercises…"
            value={q} onChange={e => setQ(e.target.value)} />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            <button onClick={() => setMg(null)}
              className={`chip shrink-0 ${!mg ? 'bg-accent text-bg border-accent' : ''}`}>All</button>
            {MUSCLE_GROUPS.map(g => (
              <button key={g} onClick={() => setMg(mg === g ? null : g)}
                className={`chip shrink-0 ${mg === g ? 'bg-accent text-bg border-accent' : ''}`}>{g}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto -mx-1">
            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-8 text-sm">No matches.
                <button className="text-accent ml-1" onClick={() => setShowCustom(true)}>Create “{q}”</button>
              </p>
            )}
            {filtered.map(e => {
              const sel = selected.includes(e.id)
              return (
                <button key={e.id} onClick={() => toggle(e.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left ${
                    sel ? 'bg-accent/20 border border-accent/50' : 'bg-surface2 border border-transparent'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.name}</div>
                    <div className="text-xs text-gray-500">
                      {e.muscle_group} · {e.equipment}
                      {e.tracking_type === 'duration' && ' · timed'}
                      {e.is_custom && <span className="ml-1 text-accent">custom</span>}
                    </div>
                  </div>
                  {multi && (
                    <span className={`h-5 w-5 rounded-full border-2 shrink-0 grid place-items-center text-xs ${
                      sel ? 'bg-accent border-accent text-bg' : 'border-gray-600'}`}>{sel ? '✓' : ''}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="shrink-0 pt-2 flex gap-2 border-t border-border mt-2">
            <button className="btn-ghost flex-1" onClick={() => setShowCustom(true)}>+ New exercise</button>
            {multi && (
              <button className="btn-primary flex-1 disabled:opacity-40" disabled={!selected.length} onClick={confirm}>
                Add{selected.length ? ` ${selected.length}` : ''}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <ExerciseFormModal open={showCustom} onClose={() => setShowCustom(false)} initialName={q}
        onSaved={(id) => { setShowCustom(false); if (!multi) onPick(id) }} />
    </>
  )
}
