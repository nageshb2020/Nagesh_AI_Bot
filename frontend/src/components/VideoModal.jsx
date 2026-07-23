import { X } from 'lucide-react'
import { API_BASE } from '../api'

export default function VideoModal({ open, onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-gray-200 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <video
          className="w-full aspect-video bg-black"
          src={`${API_BASE}/api/video`}
          controls
          autoPlay
        />
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-800">A quick introduction from Nagesh</p>
          <p className="text-xs text-gray-500 mt-0.5">Thanks for taking the time to watch — feel free to keep chatting with the AI assistant below.</p>
        </div>
      </div>
    </div>
  )
}
