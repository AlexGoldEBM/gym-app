import { useAuth } from '../store/AuthContext'

export default function Login() {
  const { login, authError } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-6xl mb-4">🏋️</div>
      <h1 className="text-3xl font-bold">Gym Tracker</h1>
      <p className="text-gray-400 mt-2 mb-10 max-w-xs">
        Your training diary. Shared routines, private logs, works offline.
      </p>
      <button className="btn-primary w-full max-w-xs py-3.5 text-base" onClick={login}>
        <span className="text-lg">G</span> Sign in with Google
      </button>
      {authError && <p className="text-danger text-sm mt-4 max-w-xs">{authError}</p>}
      <p className="text-gray-600 text-xs mt-10">Installable — add to your home screen for the full app.</p>
    </div>
  )
}
