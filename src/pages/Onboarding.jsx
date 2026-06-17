import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { Spinner } from '../components/ui'

export default function Onboarding() {
  const { createHousehold, joinHousehold, logout, user } = useAuth()
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [name, setName] = useState(`${user?.displayName?.split(' ')[0] || 'My'}'s Gym`)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function doCreate() {
    setBusy(true); setErr(null)
    try { await createHousehold(name) } catch (e) { setErr(e.message); setBusy(false) }
  }
  async function doJoin() {
    setBusy(true); setErr(null)
    const r = await joinHousehold(code)
    if (r?.error) { setErr(r.error); setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome, {user?.displayName?.split(' ')[0]}</h1>
      <p className="text-gray-400 mb-8">Set up your shared workspace. You and your partner share routines & exercises but keep separate logs.</p>

      {!mode && (
        <div className="space-y-3">
          <button className="card w-full p-5 text-left active:scale-[0.99]" onClick={() => setMode('create')}>
            <div className="font-semibold text-lg">Create a household</div>
            <div className="text-sm text-gray-400">Start fresh and invite your partner with a code.</div>
          </button>
          <button className="card w-full p-5 text-left active:scale-[0.99]" onClick={() => setMode('join')}>
            <div className="font-semibold text-lg">Join with a code</div>
            <div className="text-sm text-gray-400">Enter the invite code from your partner.</div>
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-400 mb-1 block">Household name</span>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <button className="btn-primary w-full" disabled={busy} onClick={doCreate}>
            {busy ? <Spinner /> : 'Create & seed exercise library'}
          </button>
          <button className="text-gray-500 text-sm w-full" onClick={() => setMode(null)}>← Back</button>
        </div>
      )}

      {mode === 'join' && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-400 mb-1 block">Invite code</span>
            <input className="input w-full uppercase tracking-widest text-center text-lg" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABC123" />
          </label>
          <button className="btn-primary w-full" disabled={busy || code.length < 4} onClick={doJoin}>
            {busy ? <Spinner /> : 'Join household'}
          </button>
          <button className="text-gray-500 text-sm w-full" onClick={() => setMode(null)}>← Back</button>
        </div>
      )}

      {err && <p className="text-danger text-sm mt-4">{err}</p>}
      <button className="text-gray-600 text-xs mt-auto mb-8" onClick={logout}>Sign out</button>
    </div>
  )
}
