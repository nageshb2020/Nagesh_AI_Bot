import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { API_BASE } from '../api'

export default function ResumeDownloadButton() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then(r => r.json())
      .then(d => setAvailable(d.mode === 'resume'))
      .catch(() => {})
  }, [])

  if (!available) return null

  return (
    <a
      href={`${API_BASE}/api/resume/download`}
      download
      className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Download Resume
    </a>
  )
}
