import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useData } from '../store/DataContext'
import { EmptyState } from '../components/ui'
import { sessionVolume, sessionDurationMin } from '../lib/stats'
import { relativeDay, fmtDate, ms } from '../lib/util'

export default function History() {
  const { sessions } = useData()

  const stats = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400000
    const m = sessions.filter(s => ms(s.start_time) >= monthAgo)
    return {
      total: sessions.length,
      month: m.length,
      monthVol: m.reduce((v, s) => v + sessionVolume(s), 0),
    }
  }, [sessions])

  // group by month label
  const groups = useMemo(() => {
    const g = {}
    for (const s of sessions) {
      const d = new Date(ms(s.start_time))
      const key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      ;(g[key] = g[key] || []).push(s)
    }
    return Object.entries(g)
  }, [sessions])

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold mb-4">History</h1>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <Stat value={stats.total} label="Total workouts" />
        <Stat value={stats.month} label="Last 30 days" />
        <Stat value={`${Math.round(stats.monthVol / 1000)}k`} label="Volume (30d) kg" />
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="📅" title="No history yet" subtitle="Your finished workouts will appear here." />
      ) : (
        groups.map(([month, list]) => (
          <div key={month} className="mb-5">
            <h2 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">{month}</h2>
            <div className="space-y-2">
              {list.map(s => {
                const exCount = new Set((s.sets || []).map(x => x.exercise_id)).size
                const dur = sessionDurationMin(s)
                return (
                  <Link key={s.id} to={`/history/${s.id}`} className="card flex items-center gap-3 p-3">
                    <div className="flex flex-col items-center justify-center bg-surface2 rounded-lg w-12 h-12 shrink-0">
                      <span className="text-lg font-bold leading-none">{new Date(ms(s.start_time)).getDate()}</span>
                      <span className="text-[10px] text-gray-500">{new Date(ms(s.start_time)).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.title}</div>
                      <div className="text-xs text-gray-500">{exCount} exercises · {(s.sets || []).length} sets{dur != null ? ` · ${dur} min` : ''}</div>
                    </div>
                    <div className="text-sm font-semibold shrink-0">{Math.round(sessionVolume(s)).toLocaleString()}<span className="text-gray-500 text-xs"> kg</span></div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="card p-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
