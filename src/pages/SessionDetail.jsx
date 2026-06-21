import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useData } from '../store/DataContext'
import { Confirm, NumberField } from '../components/ui'
import { sessionVolume, sessionDurationMin, newPRsInSession } from '../lib/stats'
import { fmtDateTime, fmtWeight, fmtDuration, ms, uid, SET_TYPES } from '../lib/util'

export default function SessionDetail() {
  const { id } = useParams()
  const { sessions, exerciseMap, deleteSession, saveRoutine, saveSession } = useData()
  const nav = useNavigate()
  const [confirmDel, setConfirmDel] = useState(false)
  const [draft, setDraft] = useState(null) // non-null while editing

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

  // ---------- editing ----------
  function startEdit() {
    setDraft({
      title: session.title || '',
      description: session.description || '',
      groups: groups.map(g => ({
        exercise_id: g.exercise_id,
        note: g.sets.find(s => s.notes)?.notes || '',
        sets: g.sets.map(s => ({ ...s, key: s.id || uid() })),
      })),
    })
  }

  function patchSet(gi, si, patch) {
    setDraft(d => {
      const next = structuredClone(d)
      Object.assign(next.groups[gi].sets[si], patch)
      return next
    })
  }
  function cycleType(gi, si) {
    setDraft(d => {
      const next = structuredClone(d)
      const cur = next.groups[gi].sets[si].set_type || 'normal'
      const order = SET_TYPES.map(t => t.id)
      const nextType = order[(order.indexOf(cur) + 1) % order.length]
      next.groups[gi].sets[si].set_type = nextType
      return next
    })
  }
  function addSet(gi) {
    setDraft(d => {
      const next = structuredClone(d)
      const g = next.groups[gi]
      const last = g.sets[g.sets.length - 1]
      g.sets.push({
        key: uid(), id: uid('set_'), set_type: 'normal',
        weight_kg: last?.weight_kg ?? null, reps: last?.reps ?? null,
        duration_seconds: last?.duration_seconds ?? null, rpe: null,
        superset_id: last?.superset_id ?? null,
      })
      return next
    })
  }
  function removeSet(gi, si) {
    setDraft(d => {
      const next = structuredClone(d)
      next.groups[gi].sets.splice(si, 1)
      return next
    })
  }

  function saveEdit() {
    // Reconstruct the COMPLETE flat sets array — merge:true replaces arrays wholesale,
    // so a partial write would silently drop untouched exercises.
    const sets = []
    for (const g of draft.groups) {
      let idx = 0
      for (const s of g.sets) {
        sets.push({
          id: s.id || uid('set_'),
          exercise_id: g.exercise_id,
          set_index: idx++,
          set_type: s.set_type || 'normal',
          weight_kg: s.weight_kg ?? null,
          reps: s.reps ?? null,
          duration_seconds: s.duration_seconds ?? null,
          rpe: s.rpe ?? null,
          notes: g.note || '', // notes are per-exercise; write to every set consistently
          superset_id: s.superset_id || null,
        })
      }
    }
    saveSession({
      id: session.id,
      title: draft.title.trim() || 'Workout',
      routine_id: session.routine_id,
      description: draft.description,
      start_time: session.start_time, // edit is a data-fix, not a re-timing
      end_time: session.end_time,
      sets,
    })
    setDraft(null)
  }

  // Build a shareable routine template from this logged session, then open the
  // routine editor so targets can be tweaked before it's used.
  function createRoutineFromSession() {
    const exercises = groups.map(g => {
      const ex = exerciseMap[g.exercise_id]
      const isDur = ex?.tracking_type === 'duration'
      const working = g.sets.filter(s => s.set_type !== 'warmup')
      const used = working.length ? working : g.sets
      const reps = used.map(s => s.reps).filter(r => r != null)
      let target_reps = null
      if (!isDur && reps.length) {
        const counts = {}
        reps.forEach(r => { counts[r] = (counts[r] || 0) + 1 })
        target_reps = String(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
      }
      return {
        exercise_id: g.exercise_id,
        superset_id: g.sets.find(s => s.superset_id)?.superset_id || null,
        target_sets: used.length || 1,
        target_reps,
        target_weight: null, // use last weight when run
        notes: g.sets.find(s => s.notes)?.notes || '',
      }
    })
    const newId = saveRoutine({ name: session.title || 'New routine', exercises, restDefaultSec: 120 })
    nav(`/routines/${newId}`)
  }

  // ---------- edit view ----------
  if (draft) {
    return (
      <div className="px-4 pt-3 pb-24">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setDraft(null)} className="text-gray-400 px-1 text-xl">‹</button>
          <h1 className="text-xl font-bold flex-1">Edit workout</h1>
          <button className="btn-primary py-1.5 px-3 text-sm" onClick={saveEdit}>Save</button>
        </div>

        <input className="input w-full mb-2" value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" />
        <textarea className="input w-full mb-4" rows={2} placeholder="Notes…"
          value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />

        <div className="space-y-3">
          {draft.groups.map((g, gi) => {
            const ex = exerciseMap[g.exercise_id]
            const isDuration = ex?.tracking_type === 'duration'
            return (
              <div key={g.exercise_id} className="card p-3">
                <div className="font-semibold mb-1">{ex?.name || 'Unknown exercise'}</div>
                <input className="bg-transparent text-sm text-gray-300 w-full placeholder:text-gray-600 focus:outline-none mb-2"
                  placeholder="Exercise note…" value={g.note}
                  onChange={e => setDraft(d => { const n = structuredClone(d); n.groups[gi].note = e.target.value; return n })} />

                <div className="grid grid-cols-[2.2rem_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wide text-gray-600 mb-1">
                  <span>Set</span>
                  <span className="text-center">{isDuration ? 'Time (s)' : 'Kg'}</span>
                  <span className="text-center">{isDuration ? '' : 'Reps'}</span>
                  <span />
                </div>

                <div className="space-y-1.5">
                  {g.sets.map((s, si) => {
                    const t = SET_TYPES.find(x => x.id === s.set_type)
                    const labelColor = s.set_type === 'warmup' ? 'text-warn' : s.set_type === 'failure' ? 'text-danger'
                      : s.set_type === 'drop_set' ? 'text-accent' : 'text-gray-400'
                    return (
                      <div key={s.key} className="grid grid-cols-[2.2rem_1fr_1fr_2rem] gap-2 items-center">
                        <button className={`h-10 font-bold ${labelColor}`} onClick={() => cycleType(gi, si)}
                          title="Tap to change set type">{t?.short || (si + 1)}</button>
                        {isDuration ? (
                          <NumberField value={s.duration_seconds} placeholder="0"
                            onChange={v => patchSet(gi, si, { duration_seconds: v })} />
                        ) : (
                          <NumberField value={s.weight_kg} placeholder="0"
                            onChange={v => patchSet(gi, si, { weight_kg: v })} />
                        )}
                        {isDuration ? <div /> : (
                          <NumberField value={s.reps} placeholder="0"
                            onChange={v => patchSet(gi, si, { reps: v })} />
                        )}
                        <button className="h-10 text-danger text-lg" onClick={() => removeSet(gi, si)}
                          title="Remove set">×</button>
                      </div>
                    )
                  })}
                  <button className="w-full text-sm text-accent font-medium py-2 mt-1 bg-surface2 rounded-lg"
                    onClick={() => addSet(gi)}>+ Add set</button>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-600 mt-3">
          Tap a set number to switch warmup / failure / drop-set. Times stay as originally logged.
        </p>
      </div>
    )
  }

  // ---------- read view ----------
  return (
    <div className="px-4 pt-3 pb-20">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => nav('/history')} className="text-gray-400 px-1 text-xl">‹</button>
        <h1 className="text-xl font-bold flex-1 truncate">{session.title}</h1>
        <button className="btn-ghost py-1.5 px-3 text-sm" onClick={startEdit}>Edit</button>
        <button className="btn-primary py-1.5 px-3 text-sm whitespace-nowrap" onClick={createRoutineFromSession}>Save as routine</button>
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

      <button className="btn-danger w-full mt-8" onClick={() => setConfirmDel(true)}>Delete workout</button>

      <Confirm open={confirmDel} title="Delete workout?" body="This permanently removes this session from your log."
        onConfirm={async () => { await deleteSession(id); nav('/history') }} onCancel={() => setConfirmDel(false)} />
    </div>
  )
}
