import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, LogOut } from 'lucide-react'
import { API_BASE } from '../api'
import AdminDashboard from './AdminDashboard'

const STORAGE_KEY = 'admin_token'

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [tokenInput, setTokenInput] = useState('')
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  const verify = useCallback(async (candidate) => {
    setChecking(true)
    setError('')
    try {
      const resp = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: { 'X-Admin-Token': candidate },
      })
      if (resp.status === 401) {
        setVerified(false)
        setError('Invalid admin token.')
        return false
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setVerified(true)
      return true
    } catch (err) {
      setVerified(false)
      setError(err.message)
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (token) verify(token)
    else setChecking(false)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    const ok = await verify(tokenInput)
    if (ok) {
      localStorage.setItem(STORAGE_KEY, tokenInput)
      setToken(tokenInput)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setToken('')
    setVerified(false)
    setTokenInput('')
  }

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-500 text-sm">
        Checking admin access…
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-900 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h1 className="text-sm font-semibold">Admin Access</h1>
          </div>
          <input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500/60"
          />
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <button
            type="submit"
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <h1 className="text-sm font-semibold">Recruiter Bot · Admin</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-500/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Log out
        </button>
      </header>
      <AdminDashboard token={token} />
    </div>
  )
}
