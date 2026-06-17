// Per-device text/UI scale. Tailwind sizes are rem-based, so scaling the root
// font-size scales all text and spacing proportionally. Stored in localStorage
// (device preference, not synced to Firestore).
const LS_KEY = 'gym.textScale.v1'
const BASE_PX = 16

export const SCALES = [
  { id: 'sm', label: 'Small', factor: 0.9 },
  { id: 'md', label: 'Default', factor: 1.0 },
  { id: 'lg', label: 'Large', factor: 1.12 },
  { id: 'xl', label: 'Extra large', factor: 1.25 },
]

export function getScale() {
  return localStorage.getItem(LS_KEY) || 'md'
}

export function applyScale(id = getScale()) {
  const s = SCALES.find(x => x.id === id) || SCALES[1]
  document.documentElement.style.fontSize = `${BASE_PX * s.factor}px`
}

export function setScale(id) {
  localStorage.setItem(LS_KEY, id)
  applyScale(id)
}
