import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { ExercisePicker } from '../components/ExercisePicker'
import { Confirm } from '../components/ui'
import { uid } from '../lib/util'

export default function RoutineEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { routines, exerciseMap, saveRoutine, deleteRoutine } = useData()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [items, setItems] = useState([]) // {key, exercise_id, superset_id, target_sets, target_reps, target_weight, notes}
  const [restDefaultSec, setRest] = useState(120)
  const [picker, setPicker] = useState(false)
  const [supersetFor, setSupersetFor] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    if (isNew) { setLoaded(true); return }
    const r = routines.find(x => x.id === id)
    if (r) {
      setName(r.name)
      setRest(r.restDefaultSec ?? 120)
      setItems((r.exercises || []).map(e => ({ key: uid(), ...e })))
      setLoaded(true)
    }
  }, [routines, id, isNew, loaded])

  function addExercises(ids, ssAnchorKey = null) {
    const list = Array.isArray(ids) ? ids : [ids]
    setItems(prev => {
      let next = [...prev]
      let ssId = null
      if (ssAnchorKey) {
        const anchor = next.find(i => i.key === ssAnchorKey)
        if (anchor) { ssId = anchor.superset_id || uid('ss_'); anchor.superset_id = ssId }
      }
      for (const exId of list) {
        next.push({ key: uid(), exercise_id: exId, superset_id: ssId, target_sets: 3, target_reps: '8-12', target_weight: null, notes: '' })
      }
      return next
    })
  }

  function update(key, patch) { setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i)) }
  function remove(key) { setItems(prev => prev.filter(i => i.key !== key)) }
  function move(idx, dir) {
    setItems(prev => {
      const to = idx + dir
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [m] = next.splice(idx, 1)
      next.splice(to, 0, m)
      return next
    })
  }

  async function save() {
    if (!name.trim() || items.length === 0) return
    const exercises = items.map(({ key, ...rest }) => ({
      exercise_id: rest.exercise_id,
      superset_id: rest.superset_id || null,
      target_sets: Number(rest.target_sets) || 1,
      target_reps: rest.target_reps || null,
      target_weight: rest.target_weight ?? null,
      notes: rest.notes || '',
    }))
    const savedId = await saveRoutine({ id: isNew ? null : id, name, exercises, restDefaultSec })
    nav('/routines')
  }

  return (
    <div className="px-4 pt-3 pb-24">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => nav('/routines')} className="text-gray-400 px-1 text-xl">‹</button>
        <h1 className="text-xl font-bold flex-1">{isNew ? 'New routine' : 'Edit routine'}</h1>
        <button className="btn-primary py-2 px-4 text-sm disabled:opacity-40"
          disabled={!name.trim() || !items.length} onClick={save}>Save</button>
      </div>

      <input className="input w-full mb-3" placeholder="Routine name (e.g. Upper Push A)"
        value={name} onChange={e => setName(e.target.value)} />

      <label className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        Default rest
        <select className="input py-1.5 px-2" value={restDefaultSec} onChange={e => setRest(parseInt(e.target.value))}>
          {[30, 60, 90, 120, 150, 180, 240].map(s => <option key={s} value={s}>{s}s</option>)}
        </select>
      </label>

      <div className="space-y-2">
        {items.map((it, idx) => {
          const ex = exerciseMap[it.exercise_id]
          const isDuration = ex?.tracking_type === 'duration'
          return (
            <div key={it.key} className={`card p-3 ${it.superset_id ? 'border-l-4 border-l-warn' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-600 text-sm">{idx + 1}</span>
                <span className="font-semibold flex-1 truncate">{ex?.name || 'Unknown'}</span>
                {it.superset_id && <span className="chip bg-warn/20 text-warn border-warn/30">SS</span>}
                <button className="text-gray-500 px-1" onClick={() => move(idx, -1)}>↑</button>
                <button className="text-gray-500 px-1" onClick={() => move(idx, 1)}>↓</button>
                <button className="text-danger px-1" onClick={() => remove(it.key)}>✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-gray-500">Sets
                  <input type="number" inputMode="numeric" className="input w-full mt-0.5 py-1.5 text-center"
                    value={it.target_sets} onChange={e => update(it.key, { target_sets: e.target.value })} />
                </label>
                <label className="text-xs text-gray-500">{isDuration ? 'Seconds' : 'Reps'}
                  <input className="input w-full mt-0.5 py-1.5 text-center" placeholder={isDuration ? '60' : '8-12'}
                    value={it.target_reps || ''} onChange={e => update(it.key, { target_reps: e.target.value })} />
                </label>
                <label className="text-xs text-gray-500">Weight kg
                  <input type="number" inputMode="decimal" className="input w-full mt-0.5 py-1.5 text-center" placeholder="last"
                    value={it.target_weight ?? ''} onChange={e => update(it.key, { target_weight: e.target.value === '' ? null : parseFloat(e.target.value) })} />
                </label>
              </div>
              <input className="input w-full mt-2 py-1.5 text-sm" placeholder="Notes…"
                value={it.notes || ''} onChange={e => update(it.key, { notes: e.target.value })} />
              <button className="text-xs text-warn mt-2" onClick={() => { setSupersetFor(it.key); setPicker(true) }}>
                + Superset with…
              </button>
            </div>
          )
        })}
      </div>

      <button className="btn-ghost w-full mt-3 py-3" onClick={() => { setSupersetFor(null); setPicker(true) }}>+ Add exercise</button>

      {!isNew && (
        <button className="btn-danger w-full mt-6" onClick={() => setConfirmDel(true)}>Delete routine</button>
      )}

      <ExercisePicker open={picker} onClose={() => { setPicker(false); setSupersetFor(null) }}
        onPick={(ids) => { addExercises(ids, supersetFor); setPicker(false); setSupersetFor(null) }}
        title={supersetFor ? 'Add to superset' : 'Add exercise'} />

      <Confirm open={confirmDel} title="Delete routine?" body="This removes it for everyone in your household."
        onConfirm={async () => { await deleteRoutine(id); nav('/routines') }} onCancel={() => setConfirmDel(false)} />
    </div>
  )
}
