import { useState, useRef, useEffect } from 'react'
import { Upload, Video, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react'
import { API_BASE } from '../api'

export default function VideoUpload({ adminToken, onStatusChange }) {
  const [exists, setExists] = useState(false)
  const [filename, setFilename] = useState('')
  const [uiState, setUiState] = useState('idle') // idle | dragging | uploading | success | error
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/video/status`)
      const d = await r.json()
      setExists(!!d.exists)
      setFilename(d.filename ?? '')
      if (d.exists) setUiState('success')
    } catch {}
  }

  useEffect(() => { fetchStatus() }, [])

  const handleFile = async (file) => {
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['mp4', 'webm', 'mov'].includes(ext)) {
      setUiState('error')
      setMessage('Only MP4, WebM, or MOV files are supported.')
      return
    }

    setUiState('uploading')
    setMessage(file.name)

    const form = new FormData()
    form.append('file', file)

    try {
      const resp = await fetch(`${API_BASE}/api/upload/video`, {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken ?? '' },
        body: form,
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || 'Upload failed')
      }
      const data = await resp.json()
      setUiState('success')
      setFilename(data.filename)
      setExists(true)
      onStatusChange?.(true)
    } catch (err) {
      setUiState('error')
      setMessage(err.message)
    }
  }

  const handleDelete = async () => {
    setUiState('uploading')
    setMessage('Removing video...')
    try {
      await fetch(`${API_BASE}/api/upload/video`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken ?? '' },
      })
      setUiState('idle')
      setExists(false)
      setFilename('')
      onStatusChange?.(false)
    } catch {
      setUiState('idle')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setUiState('idle')
    handleFile(e.dataTransfer.files[0])
  }

  if (uiState === 'success') {
    return (
      <div>
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Video className="w-3 h-3 text-indigo-500" />
          Intro Video
        </h3>
        <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-600">Video live</p>
              <p className="text-[10px] text-green-600/60 mt-0.5 truncate" title={filename}>{filename}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setUiState('idle'); inputRef.current?.click() }}
              className="flex-1 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 hover:text-indigo-600 border border-gray-300 hover:border-indigo-500/40 rounded-lg px-2 py-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Replace
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-500/40 rounded-lg px-2 py-1.5 transition-colors"
              title="Remove video"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.webm,.mov"
          className="hidden"
          onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
        />
      </div>
    )
  }

  if (uiState === 'uploading') {
    return (
      <div>
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Uploading Video
        </h3>
        <div className="border border-indigo-500/30 rounded-xl p-4 flex flex-col items-center gap-3 bg-indigo-500/5">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <div className="text-center">
            <p className="text-xs text-gray-600">Uploading…</p>
            <p className="text-[10px] text-gray-500 mt-1 max-w-[160px] truncate">{message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Video className="w-3 h-3 text-indigo-500" />
        Upload Intro Video
      </h3>

      <div
        onDragOver={e => { e.preventDefault(); setUiState('dragging') }}
        onDragLeave={() => setUiState('idle')}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-150 ${
          uiState === 'dragging'
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-gray-300 hover:border-indigo-500/50 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.webm,.mov"
          className="hidden"
          onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
        />

        <div className="flex flex-col items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            uiState === 'dragging'
              ? 'bg-indigo-500/25 border border-indigo-500/40'
              : 'bg-indigo-500/10 border border-indigo-500/20'
          }`}>
            <Upload className={`w-4 h-4 transition-colors ${uiState === 'dragging' ? 'text-indigo-600' : 'text-indigo-500'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-600">
              {uiState === 'dragging' ? 'Drop to upload' : 'Drop your intro video'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">MP4, WebM, or MOV · Click to browse</p>
          </div>
        </div>
      </div>

      {uiState === 'error' && (
        <div className="mt-2 flex items-start gap-1.5 text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-snug">{message}</p>
        </div>
      )}
    </div>
  )
}
