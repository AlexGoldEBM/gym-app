import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useData } from './DataContext'
import { useAuth } from './AuthContext'
import { uid, ms } from '../lib/util'

const WorkoutCtx = createContext(null)
export const useWorkout = () => useContext(WorkoutCtx)

const LS_KEY = 'gym.activeWorkout.v1'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null } catch { return null }
}

export function WorkoutProvider({ children }) {
  const { saveSession, exerciseMap } = useData()
  const { profile } = useAuth()
  const [active, setActive] = useState(load)

  // rest timer
  const [rest, setRest] = useState(null) // { endsAt, duration }
  const [now, setNow] = useState(Date.now())
  const wakeLockRef = useRef(null)
  const audioRef = useRef(null)

  // persist active workout for crash/refresh resilience
  useEffect(() => {
    if (active) localStorage.setItem(LS_KEY, JSON.stringify(active))
    else localStorage.removeItem(LS_KEY)
  }, [active])

  // ticking clock while a rest timer or workout is live
  useEffect(() => {
    if (!rest && !active) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [rest, active])

  // fire when rest hits zero
  const firedRef = useRef(false)
  useEffect(() => {
    if (!rest) { firedRef.current = false; return }
    if (now >= rest.endsAt && !firedRef.current) {
      firedRef.current = true
      notifyRestDone()
      setRest(null)
    }
  }, [now, rest])

  // ---- wake lock so screen-on countdowns stay accurate during a workout ----
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch { /* ignore */ }
  }
  function releaseWakeLock() {
    try { wakeLockRef.current?.release?.() } catch {}
    wakeLockRef.current = null
  }
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && active) requestWakeLock() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [active])

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ac = audioRef.current || (audioRef.current = new Ctx())
      if (ac.state === 'suspended') ac.resume()
      const o = ac.createOscillator(), g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.frequency.value = 880; o.type = 'sine'
      g.gain.setValueAtTime(0.001, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4)
      o.start(); o.stop(ac.currentTime + 0.42)
    } catch {}
  }

  function notifyRestDone() {
    beep()
    if ('vibrate' in navigator) navigator.vibrate?.([200, 80, 200])
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Rest done', { body: 'Time for your next set', silent: false, tag: 'rest' }) } catch {}
    }
  }

  // ---------- Workout lifecycle ----------
  const startWorkout = useCallback((opts = {}) => {
    const w = {
      id: uid('s_'),
      title: opts.title || 'Workout',
      routine_id: opts.routine_id || null,
      description: '',
      start_time: Date.now(),
      restDefaultSec: opts.restDefaultSec ?? profile?.restDefaultSec ?? 120,
      exercises: opts.exercises || [],
    }
    setActive(w)
    requestWakeLock()
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    return w
  }, [profile])

  const update = useCallback((fn) => {
    setActive(prev => (prev ? fn(structuredClone(prev)) : prev))
  }, [])

  const addExerciseToWorkout = useCallback((exercise_id, superset_id = null) => {
    update(w => {
      w.exercises.push({
        key: uid(),
        exercise_id,
        superset_id,
        notes: '',
        target_reps: null,
        restSec: w.restDefaultSec,
        sets: [{ key: uid(), set_type: 'normal', weight_kg: null, reps: null, duration_seconds: null, rpe: null, done: false }],
      })
      return w
    })
  }, [update])

  const removeExerciseFromWorkout = useCallback((key) => {
    update(w => { w.exercises = w.exercises.filter(e => e.key !== key); return w })
  }, [update])

  // Add a new exercise grouped into a superset with the anchor exercise.
  const addExerciseAsSuperset = useCallback((anchorKey, exercise_id) => {
    update(w => {
      const anchor = w.exercises.find(e => e.key === anchorKey)
      if (!anchor) return w
      if (!anchor.superset_id) anchor.superset_id = uid('ss_')
      const anchorIdx = w.exercises.findIndex(e => e.key === anchorKey)
      // place the new exercise right after the last member of this superset
      let insertAt = anchorIdx + 1
      while (insertAt < w.exercises.length && w.exercises[insertAt].superset_id === anchor.superset_id) insertAt++
      w.exercises.splice(insertAt, 0, {
        key: uid(),
        exercise_id,
        superset_id: anchor.superset_id,
        notes: '',
        target_reps: null,
        restSec: w.restDefaultSec,
        sets: [{ key: uid(), set_type: 'normal', weight_kg: null, reps: null, duration_seconds: null, rpe: null, done: false }],
      })
      return w
    })
  }, [update])

  const addSet = useCallback((exKey) => {
    update(w => {
      const ex = w.exercises.find(e => e.key === exKey)
      if (ex) {
        const last = ex.sets[ex.sets.length - 1]
        ex.sets.push({
          key: uid(), set_type: 'normal',
          weight_kg: last?.weight_kg ?? null,
          reps: last?.reps ?? null,
          duration_seconds: last?.duration_seconds ?? null,
          rpe: null, done: false,
        })
      }
      return w
    })
  }, [update])

  const updateSet = useCallback((exKey, setKey, patch) => {
    update(w => {
      const ex = w.exercises.find(e => e.key === exKey)
      const st = ex?.sets.find(s => s.key === setKey)
      if (st) Object.assign(st, patch)
      return w
    })
  }, [update])

  const removeSet = useCallback((exKey, setKey) => {
    update(w => {
      const ex = w.exercises.find(e => e.key === exKey)
      if (ex) ex.sets = ex.sets.filter(s => s.key !== setKey)
      return w
    })
  }, [update])

  const setExerciseNotes = useCallback((exKey, notes) => {
    update(w => { const ex = w.exercises.find(e => e.key === exKey); if (ex) ex.notes = notes; return w })
  }, [update])

  const setExerciseRest = useCallback((exKey, restSec) => {
    update(w => { const ex = w.exercises.find(e => e.key === exKey); if (ex) ex.restSec = restSec; return w })
  }, [update])

  // Mark a set done -> auto-start its rest timer.
  const completeSet = useCallback((exKey, setKey) => {
    // Compute restSec synchronously from current state before queuing the update,
    // because the setActive updater runs async (batched) so restSec would always
    // be null by the time startRest is called if set inside the updater.
    const ex = active?.exercises.find(e => e.key === exKey)
    const st = ex?.sets.find(s => s.key === setKey)
    const willBeDone = st ? !st.done : false
    const restSec = (willBeDone && st?.set_type !== 'warmup')
      ? (ex?.restSec ?? active?.restDefaultSec)
      : null

    update(w => {
      const ex2 = w.exercises.find(e => e.key === exKey)
      const st2 = ex2?.sets.find(s => s.key === setKey)
      if (st2) st2.done = !st2.done
      return w
    })
    if (restSec) startRest(restSec)
  }, [update, active])

  // ---------- Rest timer controls ----------
  const startRest = useCallback((seconds) => {
    firedRef.current = false
    setRest({ endsAt: Date.now() + seconds * 1000, duration: seconds })
    setNow(Date.now())
  }, [])
  const addRest = useCallback((delta) => {
    setRest(r => r ? { ...r, endsAt: r.endsAt + delta * 1000, duration: r.duration + delta } : r)
  }, [])
  const skipRest = useCallback(() => setRest(null), [])

  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0

  // ---------- Finish / cancel ----------
  const finishWorkout = useCallback(async () => {
    if (!active) return
    const sets = []
    for (const ex of active.exercises) {
      let idx = 0
      for (const s of ex.sets) {
        // keep a set if it has any logged value
        const hasVal = s.weight_kg != null || s.reps != null || s.duration_seconds != null
        if (!hasVal && !s.done) continue
        sets.push({
          id: uid(),
          exercise_id: ex.exercise_id,
          set_index: idx++,
          set_type: s.set_type || 'normal',
          weight_kg: s.weight_kg ?? null,
          reps: s.reps ?? null,
          duration_seconds: s.duration_seconds ?? null,
          rpe: s.rpe ?? null,
          notes: ex.notes || '',
          superset_id: ex.superset_id || null,
        })
      }
    }
    await saveSession({
      id: active.id,
      title: active.title,
      routine_id: active.routine_id,
      description: active.description,
      start_time: active.start_time,
      end_time: Date.now(),
      sets,
    })
    setActive(null)
    setRest(null)
    releaseWakeLock()
  }, [active, saveSession])

  const cancelWorkout = useCallback(() => {
    setActive(null)
    setRest(null)
    releaseWakeLock()
  }, [])

  const setTitle = useCallback((title) => update(w => { w.title = title; return w }), [update])
  const setDescription = useCallback((description) => update(w => { w.description = description; return w }), [update])
  const reorderExercise = useCallback((from, to) => {
    update(w => {
      if (to < 0 || to >= w.exercises.length) return w
      const [m] = w.exercises.splice(from, 1)
      w.exercises.splice(to, 0, m)
      return w
    })
  }, [update])

  const value = {
    active, rest, restRemaining, now,
    startWorkout, finishWorkout, cancelWorkout,
    addExerciseToWorkout, addExerciseAsSuperset, removeExerciseFromWorkout, reorderExercise,
    addSet, updateSet, removeSet, completeSet, setExerciseNotes, setExerciseRest,
    setTitle, setDescription,
    startRest, addRest, skipRest,
  }
  return <WorkoutCtx.Provider value={value}>{children}</WorkoutCtx.Provider>
}
