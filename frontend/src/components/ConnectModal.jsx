import { useState } from 'react'
import { X, Mail, Linkedin, CalendarClock, Send, CheckCircle2 } from 'lucide-react'
import { API_BASE } from '../api'
import { getSessionId } from '../session'

export default function ConnectModal({ open, onClose, profile }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  if (!open) return null

  const personal = profile?.personal ?? {}

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setState('error')
      setError('Please enter your name.')
      return
    }
    setState('sending')
    try {
      const resp = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, session_id: getSessionId() }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || 'Something went wrong')
      }
      setState('sent')
    } catch (err) {
      setState('error')
      setError(err.message)
    }
  }

  const handleClose = () => {
    setState('idle')
    setForm({ name: '', email: '', company: '', message: '' })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-base font-semibold text-gray-900">Connect with {personal.name ?? 'Nagesh'}</h2>
        <p className="text-xs text-gray-500 mt-1">Leave your details and he'll follow up directly, or reach out yourself below.</p>

        <div className="flex gap-3 mt-4">
          {personal.email && (
            <a href={`mailto:${personal.email}`} title="Email" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-indigo-50 border border-gray-300 hover:border-indigo-500/40 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          )}
          {personal.linkedin && (
            <a href={`https://${personal.linkedin}`} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-indigo-50 border border-gray-300 hover:border-indigo-500/40 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {personal.calendly_url && (
            <a href={personal.calendly_url} target="_blank" rel="noopener noreferrer" title="Schedule a call" className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-indigo-50 border border-gray-300 hover:border-indigo-500/40 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors">
              <CalendarClock className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="my-4 border-t border-gray-200" />

        {state === 'sent' ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <p className="text-sm text-gray-800 font-medium">Thanks, {form.name.split(' ')[0]}!</p>
            <p className="text-xs text-gray-500">{personal.name ?? 'Nagesh'} will get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Your name *"
              value={form.name}
              onChange={handleChange('name')}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500/60"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange('email')}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500/60"
            />
            <input
              type="text"
              placeholder="Company"
              value={form.company}
              onChange={handleChange('company')}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500/60"
            />
            <textarea
              placeholder="Message (optional)"
              value={form.message}
              onChange={handleChange('message')}
              rows={3}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-indigo-500/60"
            />

            {state === 'error' && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={state === 'sending'}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {state === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
