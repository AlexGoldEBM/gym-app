/**
 * One-time Hevy import. NOT part of the live app.
 *
 * Prereqs (see DECISIONS.md):
 *   1. Alex has signed in to the deployed app once and created a household
 *      (this seeds the shared exercise library and creates his user doc).
 *   2. Download a Firebase service-account key:
 *        Firebase console -> Project Settings -> Service accounts -> Generate new private key
 *      Save it and point the env var at it.
 *
 * Run:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *   ALEX_EMAIL=alexgoldtraining@gmail.com \
 *   node scripts/import-hevy.mjs workout_data.csv
 *
 * Idempotent-ish: sessions are keyed by start_time so re-running won't duplicate them.
 */
import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const CSV = process.argv[2] || 'workout_data.csv'
const ALEX_EMAIL = process.env.ALEX_EMAIL || 'alexgoldtraining@gmail.com'

// ---- credentials ----
let credential
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    credential = cert(JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')))
  } catch { credential = applicationDefault() }
} else {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path.')
  process.exit(1)
}
initializeApp({ credential })
const db = getFirestore()
const auth = getAuth()

// ---- CSV parser (RFC-4180-ish, handles quoted fields) ----
function parseCSV(text) {
  const rows = []
  let field = '', row = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch === '\r') { /* skip */ }
    else field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// "16 Jun 2026, 14:37" -> ms
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
function parseHevyDate(s) {
  const m = s.match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2})/)
  if (!m) return null
  return new Date(Date.UTC(+m[3], MONTHS[m[2]], +m[1], +m[4], +m[5])).getTime()
}
function slugId(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function uid(p = '') { return p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4) }
function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null }

async function main() {
  // resolve Alex's uid + household
  const userRec = await auth.getUserByEmail(ALEX_EMAIL)
  const uidAlex = userRec.uid
  const userDoc = await db.doc(`users/${uidAlex}`).get()
  const householdId = process.env.HOUSEHOLD_ID || userDoc.data()?.householdId
  if (!householdId) {
    console.error('No householdId. Alex must sign in and create/join a household first (or pass HOUSEHOLD_ID).')
    process.exit(1)
  }
  console.log(`Importing for ${ALEX_EMAIL} (uid ${uidAlex}), household ${householdId}`)

  // load existing exercise library for name->id matching
  const exSnap = await db.collection(`households/${householdId}/exercises`).get()
  const byName = new Map()
  exSnap.forEach(d => byName.set(d.data().name.toLowerCase(), { id: d.id, ...d.data() }))

  const rows = parseCSV(readFileSync(CSV, 'utf8'))
  const header = rows.shift().map(h => h.replace(/^"|"$/g, ''))
  const col = Object.fromEntries(header.map((h, i) => [h, i]))

  // 1) ensure every exercise_title exists in the library (create custom if missing)
  const newExercises = new Map()
  for (const r of rows) {
    if (!r.length || !r[col.exercise_title]) continue
    const name = r[col.exercise_title].trim()
    if (!name) continue
    if (byName.has(name.toLowerCase())) continue
    if (newExercises.has(name.toLowerCase())) continue
    const isDuration = !!num(r[col.duration_seconds]) && !num(r[col.weight_kg]) && !num(r[col.reps])
    const id = slugId(name)
    newExercises.set(name.toLowerCase(), {
      id, name,
      base_movement: name.replace(/\s*\(.*\)$/, ''),
      muscle_group: 'Full Body',
      equipment: 'Bodyweight',
      tracking_type: isDuration ? 'duration' : 'weight_reps',
      is_custom: true, archived: false, created_by: uidAlex,
    })
  }
  if (newExercises.size) {
    const batch = db.batch()
    for (const ex of newExercises.values()) {
      batch.set(db.doc(`households/${householdId}/exercises/${ex.id}`), { ...ex, createdAt: FieldValue.serverTimestamp() }, { merge: true })
      byName.set(ex.name.toLowerCase(), ex)
    }
    await batch.commit()
    console.log(`Created ${newExercises.size} exercises not in seed library.`)
  }

  // 2) group rows into sessions keyed by start_time
  const sessions = new Map()
  for (const r of rows) {
    if (!r.length || !r[col.exercise_title]) continue
    const start = parseHevyDate(r[col.start_time])
    if (start == null) continue
    const key = String(start)
    if (!sessions.has(key)) {
      sessions.set(key, {
        title: r[col.title] || 'Workout',
        start_time: start,
        end_time: parseHevyDate(r[col.end_time]) || null,
        description: r[col.description] || '',
        sets: [],
      })
    }
    const ex = byName.get(r[col.exercise_title].trim().toLowerCase())
    const isDuration = ex?.tracking_type === 'duration'
    sessions.get(key).sets.push({
      id: uid(),
      exercise_id: ex?.id || slugId(r[col.exercise_title]),
      set_index: parseInt(r[col.set_index]) || 0,
      set_type: r[col.set_type] || 'normal',
      weight_kg: isDuration ? null : num(r[col.weight_kg]),
      reps: isDuration ? null : (num(r[col.reps]) != null ? Math.round(num(r[col.reps])) : null),
      duration_seconds: num(r[col.duration_seconds]),
      rpe: num(r[col.rpe]),
      notes: r[col.exercise_notes] || '',
      superset_id: r[col.superset_id] ? `hevy-${r[col.superset_id]}` : null,
    })
  }

  // 3) write sessions (doc id derived from start_time so re-runs overwrite, not duplicate)
  let n = 0
  let batch = db.batch(), ops = 0
  for (const [key, s] of sessions) {
    const sid = `hevy-${key}`
    batch.set(db.doc(`users/${uidAlex}/sessions/${sid}`), {
      ...s,
      routine_id: null,
      updatedAt: FieldValue.serverTimestamp(),
    })
    n++; ops++
    if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0 }
  }
  if (ops) await batch.commit()
  console.log(`Imported ${n} sessions with ${rows.length} set rows. Done.`)
}

main().catch(e => { console.error(e); process.exit(1) })
