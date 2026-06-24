import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkout } from '../store/WorkoutContext'
import { useData } from '../store/DataContext'
import { ExercisePicker } from '../components/ExercisePicker'
import { Confirm, Modal, NumberField } from '../components/ui'
import { lastPerformance, exercisePRs, repMaxTable, recentSessions, livePRSetKeys } from '../lib/stats'
import { fmtClock, fmtWeight, fmtDuration, fmtDate, SET_TYPES, uid } from '../lib/util'
import { burst } from '../lib/confetti'

export default function ActiveWorkout() {
  const w = useWorkout()
  const { active, now } = w
  const { exerciseMap, sessions } = useData()
  const nav = useNavigate()
  const [picker, setPicker] = useState(false)
  const [supersetFor, setSupersetFor] = useState(null) // exKey to attach new exercise as superset
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [editTitle, setEditTitle] = useState(false)

  if (!active) {
    return (
      <div className="px-4 pt-16 text-center text-gray-400">
        <p>No active workout.</p>
        <button className="btn-primary mt-4" onClick={() => nav('/')}>Go home</button>
      </div>
    )
  }

  const elapsed = Math.floor((now - active.start_time) / 1000)
  const doneSets = active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)

  function onPick(ids) {
    const list = Array.isArray(ids) ? ids : [ids]
    if (supersetFor) {
      list.forEach(id => w.addExerciseAsSuperset(supersetFor, id))
      setSupersetFor(null)
    } else {
      list.forEach(id => w.addExerciseToWorkout(id))
    }
    setPicker(false)
  }

  function finish() {
    const hasData = active.exercises.some(e => e.sets.some(s => s.weight_kg != null || s.reps != null || s.duration_seconds != null || s.done))
    if (!hasData) { setConfirmCancel(true); return }
    setConfirmFinish(true)
  }
  async function doFinish() {
    await w.finishWorkout()
    setConfirmFinish(false)
    nav('/')
  }

  return (
    <div className="pb-44">
      {/* sticky header */}
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => nav('/')} className="text-gray-400 px-1">‹</button>
          <button className="font-bold text-lg truncate flex-1 text-left" onClick={() => setEditTitle(true)}>
            {active.title}
          </button>
          <button className="btn-ghost py-1.5 px-3 text-sm" onClick={() => setConfirmCancel(true)}>Discard</button>
          <button className="btn-primary py-1.5 px-3 text-sm" onClick={finish}>Finish</button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 pl-6">
          <span className="font-mono text-accent">{fmtClock(elapsed)}</span>
          <span>{active.exercises.length} exercises</span>
          <span>{doneSets} sets done</span>
        </div>
      </div>

      <div className="px-3 pt-3 space-y-3">
        {active.exercises.length === 0 && (
          <div className="card p-8 text-center text-gray-500 text-sm">
            Add your first exercise to start logging.
          </div>
        )}

        {active.exercises.map((ex, i) => (
          <ExerciseBlock key={ex.key} ex={ex} index={i} w={w}
            exercise={exerciseMap[ex.exercise_id]} sessions={sessions}
            onAddSuperset={() => { setSupersetFor(ex.key); setPicker(true) }}
            isFirst={i === 0} isLast={i === active.exercises.length - 1} />
        ))}

        <button className="btn-ghost w-full py-3.5" onClick={() => { setSupersetFor(null); setPicker(true) }}>
          + Add exercise
        </button>
      </div>

      <ExercisePicker open={picker} onClose={() => { setPicker(false); setSupersetFor(null) }}
        onPick={onPick} title={supersetFor ? 'Add to superset' : 'Add exercise'} />

      <Modal open={editTitle} onClose={() => setEditTitle(false)} title="Workout details">
        <div className="space-y-3">
          <input className="input w-full" value={active.title} onChange={e => w.setTitle(e.target.value)} />
          <textarea className="input w-full" rows={3} placeholder="Notes…"
            value={active.description} onChange={e => w.setDescription(e.target.value)} />
          <button className="btn-primary w-full" onClick={() => setEditTitle(false)}>Done</button>
        </div>
      </Modal>

      <Confirm open={confirmFinish} title="Finish workout?"
        body="Save this session to your training log." confirmLabel="Finish & save" danger={false}
        onConfirm={doFinish} onCancel={() => setConfirmFinish(false)} />
      <Confirm open={confirmCancel} title="Discard workout?"
        body="This workout will be deleted and not saved." confirmLabel="Discard"
        onConfirm={() => { w.cancelWorkout(); setConfirmCancel(false); nav('/') }}
        onCancel={() => setConfirmCancel(false)} />
    </div>
  )
}

function ExerciseBlock({ ex, index, w, exercise, sessions, onAddSuperset, isFirst, isLast }) {
  const [menu, setMenu] = useState(false)
  const [insights, setInsights] = useState(false)
  const isDuration = exercise?.tracking_type === 'duration'
  const last = useMemo(() => lastPerformance(sessions, ex.exercise_id), [sessions, ex.exercise_id])
  const prs = useMemo(() => exercisePRs(sessions, ex.exercise_id, exercise?.tracking_type), [sessions, ex.exercise_id, exercise])

  // Rep-PRs among the live sets (heavier than ever logged at that rep count).
  const prKeys = useMemo(
    () => isDuration ? new Set() : livePRSetKeys(ex.sets, prs.perRep),
    [ex.sets, prs.perRep, isDuration])

  // Fire confetti when a set first becomes a PR (transition), not on every render.
  const seenPR = useRef(new Set())
  useEffect(() => {
    let fresh = false
    for (const k of prKeys) if (!seenPR.current.has(k)) { fresh = true; break }
    seenPR.current = new Set(prKeys)
    if (fresh) burst()
  }, [prKeys])

  const ssColor = ex.superset_id ? 'border-l-4 border-l-warn' : ''

  return (
    <div className={`card ${ssColor}`}>
      <div className="flex items-start gap-2 px-3 pt-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button className="font-bold truncate text-left flex items-center gap-1 min-w-0"
              onClick={() => setInsights(true)} disabled={!exercise}>
              <span className="truncate">{exercise?.name || 'Unknown exercise'}</span>
              {exercise && <span className="text-accent text-xs shrink-0">›</span>}
            </button>
            {ex.superset_id && <span className="chip bg-warn/20 text-warn border-warn/30">superset</span>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {exercise?.muscle_group}
            {ex.target_sets && ` · target ${ex.target_sets}×${ex.target_reps || '–'}`}
            {prs.bestWeight > 0 && ` · PR ${fmtWeight(prs.bestWeight)}kg`}
            {isDuration && prs.bestDuration > 0 && ` · PR ${fmtDuration(prs.bestDuration)}`}
          </div>
        </div>
        <button onClick={() => setMenu(m => !m)} className="text-gray-400 px-2 text-xl leading-none">⋯</button>
      </div>

      {menu && (
        <div className="px-3 py-2 mt-2 bg-surface2 rounded-lg mx-3 text-sm space-y-1">
          <button className="block w-full text-left py-1.5" onClick={() => { onAddSuperset(); setMenu(false) }}>➕ Superset another exercise</button>
          <RestPicker ex={ex} w={w} />
          {!isFirst && <button className="block w-full text-left py-1.5" onClick={() => { w.reorderExercise(index, index - 1); setMenu(false) }}>↑ Move up</button>}
          {!isLast && <button className="block w-full text-left py-1.5" onClick={() => { w.reorderExercise(index, index + 1); setMenu(false) }}>↓ Move down</button>}
          <button className="block w-full text-left py-1.5 text-danger" onClick={() => { w.removeExerciseFromWorkout(ex.key); setMenu(false) }}>🗑 Remove exercise</button>
        </div>
      )}

      {/* notes */}
      <input className="bg-transparent text-sm text-gray-300 px-3 py-1.5 w-full placeholder:text-gray-600 focus:outline-none"
        placeholder="Add note…" value={ex.notes}
        onChange={e => w.setExerciseNotes(ex.key, e.target.value)} />

      {/* last time hint */}
      {last && (
        <div className="px-3 pb-1 text-[11px] text-gray-500">
          Last: {last.sets.map((s, i) => (
            <span key={i} className="mr-2">
              {isDuration ? fmtDuration(s.duration_seconds) : `${fmtWeight(s.weight_kg)}×${s.reps}`}
            </span>
          ))}
        </div>
      )}

      {/* column headers */}
      <div className="grid grid-cols-[2.2rem_1fr_1fr_3rem] gap-2 px-3 pt-1 text-[10px] uppercase tracking-wide text-gray-600 font-medium">
        <span>Set</span>
        <span className="text-center">{isDuration ? 'Time (s)' : 'Kg'}</span>
        <span className="text-center">{isDuration ? '' : 'Reps'}</span>
        <span className="text-center">✓</span>
      </div>

      <div className="px-3 pb-3 pt-1 space-y-1.5">
        {ex.sets.map((s, si) => (
          <SetRow key={s.key} ex={ex} set={s} index={si} w={w} isDuration={isDuration}
            prev={last?.sets?.[si]} isPR={prKeys.has(s.key)} />
        ))}
        <button className="w-full text-sm text-accent font-medium py-2 mt-1 bg-surface2 rounded-lg"
          onClick={() => w.addSet(ex.key)}>+ Add set</button>
      </div>

      {insights && (
        <ExerciseInsights ex={exercise} sessions={sessions} isDuration={isDuration}
          onClose={() => setInsights(false)} />
      )}
    </div>
  )
}

function ExerciseInsights({ ex, sessions, isDuration, onClose }) {
  const recent = useMemo(() => recentSessions(sessions, ex.id, 4), [sessions, ex.id])
  const repTable = useMemo(() => isDuration ? [] : repMaxTable(sessions, ex.id, 12), [sessions, ex.id, isDuration])
  const prs = useMemo(() => exercisePRs(sessions, ex.id, ex.tracking_type), [sessions, ex])
  const bestRM = Math.max(0, ...repTable.map(r => r.est1RM))

  return (
    <Modal open onClose={onClose} title={ex.name}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto -mx-1 px-1">
        {/* recent sessions */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">Recent workouts</div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">No history yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recent.map(r => (
                <div key={r.id} className="flex gap-2 text-sm">
                  <span className="text-gray-500 shrink-0 w-16 text-xs pt-0.5">{fmtDate(r.time)}</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {r.sets.map((s, i) => (
                      <span key={i} className={s.set_type === 'warmup' ? 'text-gray-600' : ''}>
                        {isDuration ? fmtDuration(s.duration_seconds) : `${fmtWeight(s.weight_kg)}×${s.reps}`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* rep-max targets */}
        {!isDuration && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
              Top weight by reps — beatable targets
            </div>
            <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 text-[10px] uppercase tracking-wide text-gray-600 mb-1">
              <span>Reps</span><span className="text-right">Best</span><span className="text-right">Est 1RM</span>
            </div>
            <div className="space-y-0.5">
              {repTable.map(r => {
                const isTopRM = r.est1RM > 0 && r.est1RM === bestRM
                return (
                  <div key={r.reps}
                    className={`grid grid-cols-[2rem_1fr_1fr] gap-x-2 items-center py-1 rounded ${
                      isTopRM ? 'bg-good/10' : ''} ${r.weight === 0 ? 'opacity-40' : ''}`}>
                    <span className="font-bold text-gray-400">{r.reps}</span>
                    <span className="text-right font-semibold">
                      {r.weight ? `${fmtWeight(r.weight)} kg` : '—'}
                    </span>
                    <span className="text-right text-gray-400">
                      {r.est1RM ? `${Math.round(r.est1RM)} kg` : '—'}
                      {isTopRM && <span className="text-good ml-1">★</span>}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-600 mt-2">
              ★ = best estimated 1RM. Empty rep counts are open targets — hit any weight there to set a PR.
            </p>
          </div>
        )}

        {isDuration && (
          <div className="text-sm">
            <span className="text-gray-500">Best hold: </span>
            <span className="font-semibold">{prs.bestDuration ? fmtDuration(prs.bestDuration) : '—'}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

function DurationField({ value, placeholder, locked, onChange }) {
  const [running, setRunning] = useState(false)
  const valueRef = useRef(value)
  valueRef.current = value

  // Stop ticking if the set gets locked in.
  useEffect(() => { if (locked) setRunning(false) }, [locked])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      onChange(Math.round((valueRef.current ?? 0) + 1))
    }, 1000)
    return () => clearInterval(id)
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        placeholder={placeholder}
        readOnly={running || locked}
        onChange={e => { const v = e.target.value; onChange(v === '' ? null : parseInt(v)) }}
        className="input w-full text-center text-lg font-semibold py-3" />
      <button
        type="button"
        disabled={locked}
        onClick={() => setRunning(r => !r)}
        className={`h-10 w-9 shrink-0 grid place-items-center rounded-lg text-base ${
          running ? 'bg-good/25 text-good' : 'bg-surface2 text-accent'} disabled:opacity-40`}
        aria-label={running ? 'Pause timer' : 'Start timer'}>
        {running ? '⏸' : '▶'}
      </button>
    </div>
  )
}

function RestPicker({ ex, w }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-gray-400">⏱ Rest</span>
      <select className="input py-1 px-2 text-sm" value={ex.restSec}
        onChange={e => w.setExerciseRest(ex.key, parseInt(e.target.value))}>
        {[30, 60, 90, 120, 150, 180, 240, 300].map(s => <option key={s} value={s}>{s}s</option>)}
      </select>
    </div>
  )
}

function SetRow({ ex, set, index, w, isDuration, prev, isPR }) {
  const [showType, setShowType] = useState(false)
  const typeInfo = SET_TYPES.find(t => t.id === set.set_type)
  const label = typeInfo?.short || (index + 1)
  const labelColor = set.set_type === 'warmup' ? 'text-warn' : set.set_type === 'failure' ? 'text-danger'
    : set.set_type === 'drop_set' ? 'text-accent' : 'text-gray-400'

  return (
    <div className={`grid grid-cols-[2.2rem_1fr_1fr_3rem] gap-2 items-center rounded-lg ${set.done ? 'bg-good/10' : ''} ${set.done && isPR ? 'ring-1 ring-amber-400/50' : ''}`}>
      <button className={`h-10 font-bold relative ${labelColor}`} onClick={() => setShowType(true)}>
        {set.done && isPR ? <span title="Best ever at these reps">🏆</span> : label}
      </button>

      {isDuration ? (
        <DurationField
          value={set.duration_seconds}
          placeholder={prev?.duration_seconds ?? '0'}
          locked={set.done}
          onChange={v => w.updateSet(ex.key, set.key, { duration_seconds: v })} />
      ) : (
        <NumberField value={set.weight_kg} placeholder={prev?.weight_kg ?? '0'}
          onChange={v => w.updateSet(ex.key, set.key, { weight_kg: v })} />
      )}

      {isDuration ? <div /> : (
        <NumberField value={set.reps} placeholder={prev?.reps ?? '0'}
          onChange={v => w.updateSet(ex.key, set.key, { reps: v })} />
      )}

      {(() => {
        const canComplete = set.done || (isDuration
          ? set.duration_seconds != null
          : set.weight_kg != null && set.reps != null)
        return (
          <button onClick={() => canComplete && w.completeSet(ex.key, set.key)}
            className={`h-10 w-full rounded-lg grid place-items-center text-lg font-bold transition-opacity ${
              set.done ? 'bg-good text-white' : canComplete ? 'bg-surface2 text-gray-500' : 'bg-surface2 text-gray-700 opacity-40'}`}>✓</button>
        )
      })()}

      <Modal open={showType} onClose={() => setShowType(false)} title="Set type">
        <div className="space-y-2">
          {SET_TYPES.map(t => (
            <button key={t.id} onClick={() => { w.updateSet(ex.key, set.key, { set_type: t.id }); setShowType(false) }}
              className={`btn w-full justify-between ${set.set_type === t.id ? 'btn-primary' : 'btn-ghost'}`}>
              <span>{t.label}</span><span className="opacity-60">{t.short || '#'}</span>
            </button>
          ))}
          <button className="btn-danger w-full mt-2" onClick={() => { w.removeSet(ex.key, set.key); setShowType(false) }}>
            Remove this set
          </button>
        </div>
      </Modal>
    </div>
  )
}
