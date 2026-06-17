// Reads exercise_library_seed.csv -> src/data/exerciseSeed.json (bundled into app for offline seeding).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function parseCSV(text) {
  const rows = []
  let field = '', row = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch === '\r') { /* skip */ }
    else field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// stable slug id from name so seed is idempotent across imports/devices
function slugId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const csv = readFileSync(join(ROOT, 'exercise_library_seed.csv'), 'utf8')
const rows = parseCSV(csv).filter(r => r.length >= 5 && r[0].trim())
const header = rows.shift()

const exercises = rows.map(r => {
  const [name, base_movement, muscle_group, equipment, tracking_type] = r.map(c => c.trim())
  return {
    id: slugId(name),
    name,
    base_movement,
    muscle_group,
    equipment,
    tracking_type: tracking_type === 'duration' ? 'duration' : 'weight_reps',
    is_custom: false,
  }
})

mkdirSync(join(ROOT, 'src', 'data'), { recursive: true })
writeFileSync(join(ROOT, 'src', 'data', 'exerciseSeed.json'), JSON.stringify(exercises, null, 2))
console.log(`Wrote ${exercises.length} seed exercises`)
