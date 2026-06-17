import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, getRedirectResult,
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

// Map raw Firebase auth errors to something actionable for the user.
function friendlyAuthError(e) {
  switch (e?.code) {
    case 'auth/network-request-failed':
      return 'Network blocked. If using Brave/strict privacy mode, lower Shields for this site (or use Chrome/Safari) and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication settings.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    default:
      return e?.message || 'Sign-in failed. Please try again.'
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [profile, setProfile] = useState(undefined) // user doc (has householdId)
  const [household, setHousehold] = useState(undefined)
  const [authError, setAuthError] = useState(null)

  // auth state
  useEffect(() => {
    // surface any error from a completed redirect sign-in
    getRedirectResult(auth).catch((e) => {
      const msg = friendlyAuthError(e)
      if (msg) setAuthError(msg)
    })
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
    // Popup first on every device. signInWithRedirect requires third-party storage
    // on the Firebase auth domain (a different origin from the app), which Brave /
    // Safari ITP partition or block — that produced a redirect loop between the app
    // domain and firebaseapp.com. Popup keeps the OAuth window same-context and
    // avoids it. Only fall back to redirect if the popup genuinely can't open.
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e?.code)) {
        try { await signInWithRedirect(auth, googleProvider) }
        catch (e2) { setAuthError(friendlyAuthError(e2)) }
      } else if (e?.code !== 'auth/cancelled-popup-request' && e?.code !== 'auth/popup-closed-by-user') {
        setAuthError(friendlyAuthError(e))
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
