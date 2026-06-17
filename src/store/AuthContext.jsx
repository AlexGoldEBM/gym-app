import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, onSnapshot, collection, query, where,
  getDocs, updateDoc, arrayUnion, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'
import { inviteCode as genInvite } from '../lib/util'
import seedExercises from '../data/exerciseSeed.json'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [profile, setProfile] = useState(undefined) // user doc (has householdId)
  const [household, setHousehold] = useState(undefined)
  const [authError, setAuthError] = useState(null)

  // auth state
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u || null)
      if (!u) { setProfile(null); setHousehold(null) }
    })
  }, [])

  // live profile doc
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        // first sign-in: create a bare profile (no household yet -> onboarding)
        await setDoc(ref, {
          displayName: user.displayName || user.email,
          email: user.email,
          householdId: null,
          restDefaultSec: 120,
          createdAt: serverTimestamp(),
        })
        return
      }
      setProfile({ id: snap.id, ...snap.data() })
    }, (err) => console.error('profile snapshot', err))
  }, [user])

  // live household doc
  useEffect(() => {
    if (!profile?.householdId) { if (profile) setHousehold(null); return }
    const ref = doc(db, 'households', profile.householdId)
    return onSnapshot(ref, (snap) => {
      setHousehold(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    }, (err) => console.error('household snapshot', err))
  }, [profile?.householdId, profile])

  const login = useCallback(async () => {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      // popups blocked (common on iOS standalone PWA) -> redirect fallback
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider)
      } else if (e?.code !== 'auth/cancelled-popup-request' && e?.code !== 'auth/popup-closed-by-user') {
        setAuthError(e.message)
      }
    }
  }, [])

  const logout = useCallback(() => signOut(auth), [])

  // Seed the shared exercise library into a household (idempotent: doc id = slug).
  async function seedLibrary(householdId) {
    const exCol = collection(db, 'households', householdId, 'exercises')
    // chunk into batches of 400 (Firestore limit 500)
    for (let i = 0; i < seedExercises.length; i += 400) {
      const batch = writeBatch(db)
      for (const ex of seedExercises.slice(i, i + 400)) {
        batch.set(doc(exCol, ex.id), {
          name: ex.name,
          base_movement: ex.base_movement,
          muscle_group: ex.muscle_group,
          equipment: ex.equipment,
          tracking_type: ex.tracking_type,
          is_custom: false,
          archived: false,
          created_by: householdId,
          createdAt: serverTimestamp(),
        }, { merge: true })
      }
      await batch.commit()
    }
  }

  const createHousehold = useCallback(async (name) => {
    if (!user) return
    const hid = `${user.uid.slice(0, 6)}-${Date.now().toString(36)}`
    await setDoc(doc(db, 'households', hid), {
      name: name || `${user.displayName || 'My'}'s Gym`,
      members: [user.uid],
      inviteCode: genInvite(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'users', user.uid), { householdId: hid })
    await seedLibrary(hid)
    return hid
  }, [user])

  const joinHousehold = useCallback(async (code) => {
    if (!user) return { error: 'Not signed in' }
    const clean = (code || '').trim().toUpperCase()
    const q = query(collection(db, 'households'), where('inviteCode', '==', clean))
    const snap = await getDocs(q)
    if (snap.empty) return { error: 'No household found for that code' }
    const hdoc = snap.docs[0]
    await updateDoc(hdoc.ref, { members: arrayUnion(user.uid) })
    await updateDoc(doc(db, 'users', user.uid), { householdId: hdoc.id })
    return { ok: true }
  }, [user])

  const setRestDefault = useCallback(async (sec) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid), { restDefaultSec: sec })
  }, [user])

  const value = {
    user, profile, household, authError,
    loading: user === undefined || (user && profile === undefined),
    needsOnboarding: !!user && profile && !profile.householdId,
    login, logout, createHousehold, joinHousehold, setRestDefault,
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
