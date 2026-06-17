import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/AuthContext'
import { useWorkout } from './store/WorkoutContext'
import { Spinner } from './components/ui'
import { BottomNav } from './components/BottomNav'
import { RestTimerBar } from './components/RestTimerBar'
import { OfflineBanner } from './components/OnlineStatus'
import { ActiveWorkoutPill } from './components/ActiveWorkoutPill'

import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import ActiveWorkout from './pages/ActiveWorkout'
import Routines from './pages/Routines'
import RoutineEditor from './pages/RoutineEditor'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'
import Progress from './pages/Progress'
import ExerciseDetail from './pages/ExerciseDetail'
import Exercises from './pages/Exercises'
import Settings from './pages/Settings'

export default function App() {
  const { loading, user, needsOnboarding } = useAuth()
  const { active } = useWorkout()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Spinner className="h-8 w-8" /></div>
  }
  if (!user) return <Login />
  if (needsOnboarding) return <Onboarding />

  const onWorkoutScreen = location.pathname === '/workout'

  return (
    <div className="min-h-screen pb-20">
      <OfflineBanner />
      <div className="max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<ActiveWorkout />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routines/:id" element={<RoutineEditor />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<SessionDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {!onWorkoutScreen && <RestTimerBar />}
      {active && !onWorkoutScreen && <ActiveWorkoutPill />}
      <BottomNav />
    </div>
  )
}
