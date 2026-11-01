import { useState } from 'react'
import { CARDIO_FIELDS, cardioMachine, distanceUnit, kmToInput, inputToKm, secToMin, minToSec } from '../lib/cardio'

// Stored value <-> what the user types (time in minutes, rower distance in metres).
function converters(field, exercise) {
  if (field === 'duration_seconds') return [secToMin, minToSec]
  if (field === 'distance_km') return [v => kmToInput(v, exercise), v => inputToKm(v, exercise)]
  return [v => v, v => v]
}

export function cardioFieldLabel(field, exercise) {
  const f = CARDIO_FIELDS[field]
  const unit = field === 'distance_km' ? distanceUnit(exercise) : f.unit
  return unit ? `${f.label} (${unit})` : f.label
}

// Numeric input that converts units. Keeps the raw text while focused so a conversion
// round-trip (e.g. 30.33 min -> 1820 s -> 30.33) never rewrites what's being typed.
export function CardioField({ field, exercise, value, ghost, onChange, small = false, disabled = false }) {
  const [toInput, fromInput] = converters(field, exercise)
  const [draft, setDraft] = useState(null)
  const shown = draft ?? (value == null ? '' : String(toInput(value)))
  const ph = ghost != null ? String(toInput(ghost)) : '–'
  return (
    <input type="number" inputMode="decimal" value={shown} placeholder={ph} disabled={disabled}
      aria-label={cardioFieldLabel(field, exercise)}
      onFocus={() => setDraft(shown)}
      onBlur={() => setDraft(null)}
      onChange={e => {
        const t = e.target.value
        setDraft(t)
        const n = parseFloat(t)
        onChange(t === '' || !Number.isFinite(n) ? null : fromInput(n))
      }}
      className={`input w-full text-center font-semibold ${small ? 'py-2 text-base' : 'py-3 text-lg'}`} />
  )
}

// Second row of smaller, labelled inputs for the machine's extra fields.
export function CardioExtras({ exercise, set, onChange, disabled = false }) {
  const extra = cardioMachine(exercise).extra
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${extra.length}, minmax(0, 1fr))` }}>
      {extra.map(k => (
        <label key={k} className="block min-w-0">
          <span className="block text-[10px] uppercase tracking-wide text-gray-600 text-center truncate">
            {CARDIO_FIELDS[k].short}
          </span>
          <CardioField field={k} exercise={exercise} value={set[k]} ghost={set.ghost?.[k]} small disabled={disabled}
            onChange={v => onChange({ [k]: v })} />
        </label>
      ))}
    </div>
  )
}
