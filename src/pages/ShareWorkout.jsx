import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../store/DataContext'
import { useAuth } from '../store/AuthContext'
import { Spinner } from '../components/ui'
import { sessionVolume, sessionDurationMin, newPRsInSession } from '../lib/stats'
import { muscleSplit } from '../lib/muscleSplit'
import { CARDS, drawCard, canvasToBlob, loadCardFonts } from '../lib/shareCards'
import { fmtWeight, fmtDuration, ms, isAssistedExercise, slugId } from '../lib/util'
import { fmtCardioSet } from '../lib/cardio'

const APP_NAME = 'Gym Tracker'

// iOS (incl. iPadOS posing as Mac) can't save <a download> to Photos — esp. inside an installed
// PWA — so "Save picture" goes through the share sheet there, which offers "Save Image".
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function fmtDurationMin(min) {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  return h ? `${h}h ${min % 60}min` : `${min}min`
}

// Per exercise: working-set count + best set label, in the order performed.
function exerciseRows(session, exerciseMap) {
  const groups = new Map()
  for (const set of session.sets || []) {
    if (!groups.has(set.exercise_id)) groups.set(set.exercise_id, [])
    groups.get(set.exercise_id).push(set)
  }
  return [...groups.entries()].map(([exId, sets]) => {
    const ex = exerciseMap[exId]
    const working = sets.filter(s => s.set_type !== 'warmup')
    const used = working.length ? working : sets
    let best = ''
    if (ex?.tracking_type === 'cardio') {
      const total = {
        duration_seconds: used.reduce((a, s) => a + (s.duration_seconds || 0), 0) || null,
        distance_km: used.reduce((a, s) => a + (s.distance_km || 0), 0) || null,
      }
      best = fmtCardioSet(total, ex, { short: true })
    } else if (ex?.tracking_type === 'duration') {
      const top = Math.max(0, ...used.map(s => s.duration_seconds || 0))
      best = top ? fmtDuration(top) : ''
    } else {
      const assisted = isAssistedExercise(ex)
      const weighted = used.filter(s => s.weight_kg)
      if (weighted.length) {
        const top = weighted.reduce((a, b) => {
          if (a.weight_kg !== b.weight_kg) return (assisted ? b.weight_kg < a.weight_kg : b.weight_kg > a.weight_kg) ? b : a
          return (b.reps || 0) > (a.reps || 0) ? b : a
        })
        best = `${fmtWeight(top.weight_kg)} kg × ${top.reps ?? 0}`
      } else {
        const reps = Math.max(0, ...used.map(s => s.reps || 0))
        best = reps ? `${reps} reps` : ''
      }
    }
    return { name: ex?.name || 'Unknown exercise', sets: used.length, best }
  })
}

// Lifting volume, or for a cardio-only workout the total distance instead of "0 kg".
function volumeStat(session, exerciseMap) {
  const kg = Math.round(sessionVolume(session, exerciseMap))
  const km = (session.sets || []).reduce((a, s) =>
    a + (exerciseMap[s.exercise_id]?.tracking_type === 'cardio' ? (s.distance_km || 0) : 0), 0)
  if (!kg && km) return { volumeTitle: 'Distance', volumeLabel: `${Math.round(km * 100) / 100} km` }
  return { volumeTitle: 'Volume', volumeLabel: `${kg.toLocaleString()} kg` }
}

export default function ShareWorkout() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const justFinished = params.get('done') === '1'
  const { sessions, exercises, exerciseMap } = useData()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const canvases = useRef([])
  const scroller = useRef(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [blobs, setBlobs] = useState([])
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('')

  const session = sessions.find(s => s.id === id)
  const leave = () => nav(justFinished ? '/' : `/history/${id}`, { replace: true })

  const split = useMemo(() => session ? muscleSplit(session, exerciseMap) : null, [session, exerciseMap])
  const data = useMemo(() => {
    if (!session) return null
    return {
      title: session.title || 'Workout',
      dateLabel: new Date(ms(session.start_time)).toLocaleDateString(undefined,
        { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      durationLabel: fmtDurationMin(sessionDurationMin(session)),
      ...volumeStat(session, exerciseMap),
      records: newPRsInSession(sessions, session, exercises).length,
      userName: profile?.displayName || user?.displayName || '',
      appName: APP_NAME,
      areas: split.areas,
      regions: split.regions,
      figure: profile?.bodyType || 'male',
      exercises: exerciseRows(session, exerciseMap),
    }
  }, [session, sessions, exercises, exerciseMap, split, profile, user])

  useEffect(() => { loadCardFonts().then(() => setFontsReady(true)) }, [])

  // Draw every card, then pre-render PNGs: awaiting toBlob inside the tap handler would lose the
  // user gesture and iOS rejects navigator.share with NotAllowedError.
  useEffect(() => {
    if (!data || !fontsReady) return
    let stale = false
    CARDS.forEach((c, i) => canvases.current[i] && drawCard(canvases.current[i], c.id, data))
    Promise.all(canvases.current.map(canvasToBlob)).then(b => { if (!stale) setBlobs(b) })
    return () => { stale = true }
  }, [data, fontsReady])

  if (!session) {
    return (
      <div className="px-4 pt-16 text-center text-gray-400">
        <Spinner className="h-8 w-8" />
        <button className="btn-ghost block mx-auto mt-6" onClick={() => nav('/history')}>Back</button>
      </div>
    )
  }

  const blob = blobs[index]
  const file = blob ? new File([blob], `${slugId(data.title) || 'workout'}-${CARDS[index].id}.png`, { type: 'image/png' }) : null
  const canShareFile = !!file && !!navigator.canShare?.({ files: [file] })

  async function share() {
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if (e.name !== 'AbortError') setStatus("Couldn't open the share sheet — try Save picture.")
    }
  }

  function download() {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    setStatus('Saved to your downloads.')
  }

  function save() {
    setStatus('')
    if (IS_IOS && canShareFile) share()
    else download()
  }

  function goTo(i) {
    const el = scroller.current
    el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="px-4 pt-3 pb-24">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={leave} className="text-gray-400 px-1 text-xl">‹</button>
        <h1 className="text-xl font-bold flex-1">{justFinished ? 'Workout saved' : 'Share'}</h1>
        <button className="btn-ghost py-1.5 px-3 text-sm" onClick={leave}>Done</button>
      </div>

      <div ref={scroller}
        className="flex overflow-x-auto snap-x snap-mandatory -mx-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={e => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {CARDS.map((c, i) => (
          <div key={c.id} className="w-full shrink-0 snap-center px-4">
            <canvas ref={el => { canvases.current[i] = el }} aria-label={c.label}
              className="w-full h-auto aspect-[4/5] rounded-2xl bg-surface" />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {CARDS.map((c, i) => (
          <button key={c.id} onClick={() => goTo(i)} aria-label={c.label}
            className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-royal' : 'w-2.5 bg-border'}`} />
        ))}
      </div>
      <p className="text-center text-sm text-gray-500 mt-2">{CARDS[index].label} · swipe for more</p>

      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex-1 py-3" disabled={!file} onClick={save}>Save picture</button>
        {canShareFile && <button className="btn-ghost flex-1 py-3" onClick={() => { setStatus(''); share() }}>Share…</button>}
      </div>
      {status && <p className="text-center text-sm text-gray-400 mt-2">{status}</p>}

      {split.fullBody.length > 0 && (
        <p className="text-xs text-gray-500 mt-6 bg-surface2 rounded-lg p-3">
          Spread across all muscle groups because they're tagged Full Body:{' '}
          {split.fullBody.map((ex, i) => (
            <span key={ex.id}>{i > 0 && ', '}<Link to={`/exercises/${ex.id}`} className="text-accent">{ex.name}</Link></span>
          ))}
          . Recategorise them for a more accurate split.
        </p>
      )}
    </div>
  )
}
