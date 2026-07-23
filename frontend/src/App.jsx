import { useState, useEffect } from 'react'
import ProfileCard from './components/ProfileCard'
import ChatInterface from './components/ChatInterface'
import VideoModal from './components/VideoModal'
import ConnectModal from './components/ConnectModal'
import { API_BASE } from './api'

export default function App() {
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  )
  const [videoExists, setVideoExists] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/profile`)
      .then(r => r.json())
      .then(setProfile)
      .catch(console.error)

    fetch(`${API_BASE}/api/video/status`)
      .then(r => r.json())
      .then(d => setVideoExists(!!d.exists))
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 xl:w-80 shrink-0 transform transition-transform duration-300 md:relative md:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'
        } ${sidebarOpen ? '' : 'md:overflow-hidden'}`}
      >
        <ProfileCard profile={profile} videoExists={videoExists} onOpenVideo={() => setVideoOpen(true)} />
      </div>

      <ChatInterface
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(p => !p)}
        videoExists={videoExists}
        onOpenVideo={() => setVideoOpen(true)}
        onOpenConnect={() => setConnectOpen(true)}
      />

      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} profile={profile} />
    </div>
  )
}
