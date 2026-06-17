import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/routines', label: 'Routines', icon: '📋' },
  { to: '/history', label: 'History', icon: '📅' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/exercises', label: 'Exercises', icon: '🏋️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto grid grid-cols-5">
        {items.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? 'text-accent' : 'text-gray-500'}`}>
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
