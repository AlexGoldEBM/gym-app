import { useEffect, useState } from 'react'

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

// Slim non-intrusive banner shown only when offline.
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="bg-warn/15 text-warn text-xs font-medium text-center py-1 border-b border-warn/20">
      Offline — changes save locally and sync when you reconnect
    </div>
  )
}
