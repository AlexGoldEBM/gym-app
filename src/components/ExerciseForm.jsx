import { useState, useEffect } from 'react'
import { Modal } from './ui'
import { useData } from '../store/DataContext'
import { MUSCLE_GROUPS, EQUIPMENT } from '../lib/util'

// Create or edit a custom exercise.
export function ExerciseFormModal({ open, onClose, onSaved, initialName = '', editing = null }) {
  const { addExercise, updateExercise } = useData()
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editing ? { ...editing } : {
      name: initialName, base_movement: '', muscle_group: 'Chest',
      equipment: 'Barbell', tracking_type: 'weight_reps',
    })
  }, [open, editing, initialName])

  if (!form) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      if (editing) {
        await updateExercise(editing.id, {
          name: form.name.trim(),
          base_movement: (form.base_movement || form.name).trim(),
          muscle_group: form.muscle_group,
          equipment: form.equipment,
          tracking_type: form.tracking_type,
        })
        onSaved?.(editing.id)
      } else {
        const id = await addExercise(form)
        onSaved?.(id)
      }
      onClose()
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit exercise' : 'New exercise'}>
      <div className="space-y-4">
        <Field label="Name">
          <input autoFocus className="input w-full" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="e.g. Incline Curl (Dumbbell)" />
        </Field>
        <Field label="Base movement (optional)">
          <input className="input w-full" value={form.base_movement}
            onChange={e => set('base_movement', e.target.value)} placeholder="e.g. Bicep Curl" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Muscle group">
            <select className="input w-full" value={form.muscle_group} onChange={e => set('muscle_group', e.target.value)}>
              {MUSCLE_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Equipment">
            <select className="input w-full" value={form.equipment} onChange={e => set('equipment', e.target.value)}>
              {EQUIPMENT.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Tracking">
          <div className="grid grid-cols-2 gap-2">
            {[['weight_reps', 'Weight × Reps'], ['duration', 'Duration (timed)']].map(([v, l]) => (
              <button key={v} onClick={() => set('tracking_type', v)}
                className={`btn ${form.tracking_type === v ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
            ))}
          </div>
        </Field>
        <button className="btn-primary w-full" disabled={busy || !form.name.trim()} onClick={save}>
          {editing ? 'Save changes' : 'Create exercise'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-400 mb-1 block">{label}</span>
      {children}
    </label>
  )
}
