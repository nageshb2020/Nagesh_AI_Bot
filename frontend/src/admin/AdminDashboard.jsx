import { useState, useEffect, useCallback } from 'react'
import { Users, MessageSquare, Radio } from 'lucide-react'
import { API_BASE } from '../api'
import ResumeUpload from '../components/ResumeUpload'
import VideoUpload from '../components/VideoUpload'

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-indigo-500" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function AdminDashboard({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: { 'X-Admin-Token': token },
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setData(await resp.json())
    } catch (err) {
      setError(err.message)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const totals = data?.totals ?? { total_leads: 0, total_questions: 0, total_sessions: 0 }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile icon={Users} label="Leads captured" value={totals.total_leads} />
        <StatTile icon={MessageSquare} label="Questions asked" value={totals.total_questions} />
        <StatTile icon={Radio} label="Chat sessions" value={totals.total_sessions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <ResumeUpload adminToken={token} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <VideoUpload adminToken={token} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-4 py-3 border-b border-gray-200">
          Leads
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Message</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {(data?.leads ?? []).map(lead => (
                <tr key={lead.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800 whitespace-nowrap">{lead.name}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{lead.email || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{lead.company || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 max-w-xs truncate" title={lead.message}>{lead.message || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
              {(data?.leads ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-xs">No leads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-4 py-3 border-b border-gray-200">
          Recent Questions
        </h2>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {(data?.recent_questions ?? []).map(q => (
            <div key={q.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-800">{q.question}</p>
              <p className="text-[11px] text-gray-500 shrink-0">{formatDate(q.created_at)}</p>
            </div>
          ))}
          {(data?.recent_questions ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-gray-500 text-xs">No questions logged yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
