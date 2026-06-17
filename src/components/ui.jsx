import { useEffect } from 'react'

export function Spinner({ className = '' }) {
  return (
    <div className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent ${className}`} />
  )
}

export function Modal({ open, onClose, title, children, full = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className={`relative card w-full ${full ? 'h-[92vh] sm:h-[85vh]' : 'max-h-[88vh]'} sm:max-w-lg rounded-b-none sm:rounded-b-xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="font-bold text-lg">{title}</h2>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none px-2 -mr-2">×</button>
          </div>
        )}
        <div className="overflow-y-auto p-4 flex-1">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon = '🏋️', title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-200">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Confirm({ open, onConfirm, onCancel, title, body, confirmLabel = 'Delete', danger = true }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-gray-300 mb-5">{body}</p>
      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
        <button className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

// big-tap numeric field for mid-set entry
export function NumberField({ value, onChange, placeholder, step = 1, suffix, className = '' }) {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? null : parseFloat(v))
        }}
        className="input w-full text-center text-lg font-semibold py-3"
      />
      {suffix && <span className="text-gray-500 text-sm ml-1 shrink-0">{suffix}</span>}
    </div>
  )
}
