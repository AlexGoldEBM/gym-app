import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useData } from '../store/DataContext'

export default function Settings() {
  const { profile, household, user, logout, setRestDefault } = useAuth()
  const { exercises, sessions } = useData()
  const nav = useNavigate()
  const [copied, setCopied] = useState(false)
  const [rest, setRest] = useState(profile?.restDefaultSec ?? 120)

  function copyCode() {
    if (!household?.inviteCode) return
    navigator.clipboard?.writeText(household.inviteCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  return (
    <div className="px-4 pt-3 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="text-gray-400 px-1 text-xl">‹</button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <Section title="Account">
        <Row label="Signed in as" value={user?.email} />
        <Row label="Name" value={profile?.displayName} />
      </Section>

      <Section title="Household">
        <Row label="Name" value={household?.name} />
        <Row label="Members" value={`${household?.members?.length || 1}`} />
        <div className="pt-2">
          <div className="text-xs text-gray-500 mb-1">Invite code — share to let your partner join</div>
          <button onClick={copyCode} className="w-full bg-surface2 rounded-lg py-3 font-mono text-2xl tracking-[0.3em] text-center">
            {household?.inviteCode || '------'}
          </button>
          <div className="text-xs text-center mt-1 h-4 text-good">{copied ? 'Copied!' : ''}</div>
        </div>
      </Section>

      <Section title="Workout">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-gray-400">Default rest timer</span>
          <select className="input py-1.5 px-2" value={rest}
            onChange={e => { const v = parseInt(e.target.value); setRest(v); setRestDefault(v) }}>
            {[30, 60, 90, 120, 150, 180, 240, 300].map(s => <option key={s} value={s}>{s}s</option>)}
          </select>
        </div>
      </Section>

      <Section title="Library">
        <Row label="Exercises" value={`${exercises.length}`} />
        <Row label="Your sessions" value={`${sessions.length}`} />
      </Section>

      <button className="btn-danger w-full mt-6" onClick={logout}>Sign out</button>
      <p className="text-center text-gray-700 text-xs mt-6">Gym Tracker · PWA · works offline</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">{title}</h2>
      <div className="card p-3 space-y-1">{children}</div>
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium truncate ml-3">{value}</span>
    </div>
  )
}
