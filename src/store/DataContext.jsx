import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, getDocsFromServer,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import { uid, slugId } from '../lib/util'
import { legacyLegsGroup } from '../lib/muscleSplit'
import seedExercises from '../data/exerciseSeed.json'

const SEED_BY_ID = Object.fromEntries(seedExercises.map(e => [e.id, e]))

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

// Fire-and-forget a Firestore write. With offline persistence the write promise only
// resolves on *server* ack, so awaiting it hangs forever offline. The local cache + our
// snapshot listeners update instantly, so we don't gate UI on the promise — we just log
// failures. This is what makes offline logging seamless.
const fire = (p) => { p.catch(err => console.error('write failed', err)); }

export function DataProvider({ children }) {
  const { user, household } = useAuth()
  const hid = household?.id
  const [exercises, setExercises] = useState([])
  const [routines, setRoutines] = useState([])
  const [sessions, setSessions] = useState([])
  const [ready, setReady] = useState(false)

  // --- household-shared: exercises ---
  useEffect(() => {
    if (!hid) { setExercises([]); return }
    return onSnapshot(collection(db, 'households', hid, 'exercises'), (snap) => {
      setExercises(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (e) => console.error('exercises', e))
  }, [hid])

  // --- household-shared: routines ---
  useEffect(() => {
    if (!hid) { setRoutines([]); return }
    return onSnapshot(collection(db, 'households', hid, 'routines'), (snap) => {
      setRoutines(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (e) => console.error('routines', e))
  }, [hid])

  // --- private: sessions (sets embedded) ---
  useEffect(() => {
    if (!user) { setSessions([]); return }
    const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('start_time', 'desc'))
    return onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setReady(true)
    }, (e) => { console.error('sessions', e); setReady(true) })
  }, [user])

  // One-time migrations for libraries seeded before these fields changed: recategorise the old
  // "Legs" group, and give seeded exercises their default secondary_muscles. Idempotent — once
  // written, the snapshot no longer matches so this does nothing (customs without the field are
  // left alone; an empty array means "none" and is never overwritten).
  useEffect(() => {
    if (!hid) return
    for (const e of exercises) {
      const seed = SEED_BY_ID[e.id]
      const patch = {}
      if (e.muscle_group === 'Legs') patch.muscle_group = legacyLegsGroup(e, seed?.muscle_group)
      if (e.secondary_muscles === undefined && seed) patch.secondary_muscles = seed.secondary_muscles
      if (Object.keys(patch).length) fire(updateDoc(doc(db, 'households', hid, 'exercises', e.id), patch))
    }
  }, [hid, exercises])

  // Add seed exercises introduced after this household was created (e.g. the cardio machines).
  // Decided from a server read, never the live snapshot: the first snapshot can be a partial
  // cache, and creating "missing" docs from it could clobber real ones. Offline -> try next load.
  useEffect(() => {
    if (!hid) return
    getDocsFromServer(collection(db, 'households', hid, 'exercises')).then(snap => {
      const have = new Set(snap.docs.map(d => d.id))
      for (const ex of seedExercises) {
        if (have.has(ex.id)) continue
        fire(setDoc(doc(db, 'households', hid, 'exercises', ex.id), {
          name: ex.name, base_movement: ex.base_movement, muscle_group: ex.muscle_group,
          secondary_muscles: ex.secondary_muscles, equipment: ex.equipment,
          tracking_type: ex.tracking_type, cardio_machine: ex.cardio_machine || null,
          is_custom: false, archived: false, created_by: hid, createdAt: serverTimestamp(),
        }))
      }
    }).catch(() => {})
  }, [hid])

  const exerciseMap = useMemo(() => {
    const m = {}
    for (const e of exercises) m[e.id] = e
    return m
  }, [exercises])

  // ---------- Exercise CRUD ----------
  const addExercise = useCallback(async (data) => {
    if (!hid) return
    let id = slugId(data.name)
    if (exercises.some(e => e.id === id)) id = `${id}-${uid()}`
    fire(setDoc(doc(db, 'households', hid, 'exercises', id), {
      name: data.name.trim(),
      base_movement: (data.base_movement || data.name).trim(),
      muscle_group: data.muscle_group,
      secondary_muscles: data.secondary_muscles || [],
      equipment: data.equipment,
      tracking_type: data.tracking_type || 'weight_reps',
      cardio_machine: data.tracking_type === 'cardio' ? (data.cardio_machine || 'treadmill') : null,
      is_custom: true,
      archived: false,
      created_by: user.uid,
      createdAt: serverTimestamp(),
    }))
    return id
  }, [hid, user, exercises])

  const updateExercise = useCallback((id, patch) => {
    if (!hid) return
    fire(updateDoc(doc(db, 'households', hid, 'exercises', id), patch))
  }, [hid])

  const archiveExercise = useCallback((id, archived = true) => {
    if (!hid) return
    fire(updateDoc(doc(db, 'households', hid, 'exercises', id), { archived }))
  }, [hid])

  // ---------- Routine CRUD ----------
  const saveRoutine = useCallback((routine) => {
    if (!hid) return
    const id = routine.id || uid('r_')
    fire(setDoc(doc(db, 'households', hid, 'routines', id), {
      name: routine.name.trim(),
      exercises: routine.exercises || [],
      restDefaultSec: routine.restDefaultSec ?? null,
      created_by: routine.created_by || user.uid,
      updatedAt: serverTimestamp(),
      ...(routine.id ? {} : { createdAt: serverTimestamp() }),
    }, { merge: true }))
    return id
  }, [hid, user])

  const deleteRoutine = useCallback((id) => {
    if (!hid) return
    fire(deleteDoc(doc(db, 'households', hid, 'routines', id)))
  }, [hid])

  // ---------- Session CRUD (private) ----------
  const saveSession = useCallback((session) => {
    if (!user) return
    const id = session.id || uid('s_')
    fire(setDoc(doc(db, 'users', user.uid, 'sessions', id), {
      title: session.title || 'Workout',
      routine_id: session.routine_id || null,
      description: session.description || '',
      start_time: session.start_time,
      end_time: session.end_time || null,
      sets: session.sets || [],
      updatedAt: serverTimestamp(),
    }, { merge: true }))
    return id
  }, [user])

  const deleteSession = useCallback((id) => {
    if (!user) return
    fire(deleteDoc(doc(db, 'users', user.uid, 'sessions', id)))
  }, [user])

  const value = {
    ready, exercises, routines, sessions, exerciseMap,
    activeExercises: useMemo(() => exercises.filter(e => !e.archived), [exercises]),
    addExercise, updateExercise, archiveExercise,
    saveRoutine, deleteRoutine,
    saveSession, deleteSession,
  }
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}
