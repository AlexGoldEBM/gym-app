import { useState, useEffect } from 'react'
import { Modal } from './ui'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { MUSCLE_GROUPS, EQUIPMENT, isExerciseOwner } from '../lib/util'

// Create or edit a custom exercise.
export function ExerciseFormModal({ open, onClose, onSaved, initialName = '', editing = null }) {
  const { addExercise, updateExercise } = useData()
  const { user, household } = useAuth()
  const canRename = !editing || isExerciseOwner(editing, user, household)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editing ? { ...editing } : {
      name: initialName, base_movement: '', muscle_group: 'Chest', secondary_muscles: [],
      equipment: 'Barbell', tracking_type: 'weight_reps',
    })
  }, [open, editing, initialName])

  if (!form) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const secondary = form.secondary_muscles || []
  const setPrimary = (g) => setForm(f => ({ ...f, muscle_group: g, secondary_muscles: (f.secondary_muscles || []).filter(s => s !== g) }))
  const toggleSecondary = (g) => set('secondary_muscles', secondary.includes(g) ? secondary.filter(s => s !== g) : [...secondary, g])

  async function save() {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      if (editing) {
        await updateExercise(editing.id, {
          // firestore.rules rejects a name change from anyone but the creator
          ...(canRename && { name: form.name.trim(), base_movement: (form.base_movement || form.name).trim() }),
          muscle_group: form.muscle_group,
          secondary_muscles: form.secondary_muscles || [],
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
          <input autoFocus={canRename} className="input w-full disabled:opacity-60" value={form.name} disabled={!canRename}
            onChange={e => set('name', e.target.value)} placeholder="e.g. Incline Curl (Dumbbell)" />
          {!canRename && <span className="text-[11px] text-gray-600 mt-1 block">Only whoever created this exercise can rename it.</span>}
        </Field>
        <Field label="Base movement (optional)">
          <input className="input w-full disabled:opacity-60" value={form.base_movement} disabled={!canRename}
            onChange={e => set('base_movement', e.target.value)} placeholder="e.g. Bicep Curl" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Muscle group">
            <select className="input w-full" value={form.muscle_group} onChange={e => setPrimary(e.target.value)}>
              {MUSCLE_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Equipment">
            <select className="input w-full" value={form.equipment} onChange={e => set('equipment', e.target.value)}>
              {EQUIPMENT.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-400 mb-1 block">Secondary muscles (optional)</span>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.filter(g => g !== form.muscle_group && g !== 'Full Body').map(g => (
              <button key={g} type="button" onClick={() => toggleSecondary(g)}
                className={`chip py-1 ${secondary.includes(g) ? 'bg-royal border-royal text-white' : ''}`}>{g}</button>
            ))}
          </div>
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
