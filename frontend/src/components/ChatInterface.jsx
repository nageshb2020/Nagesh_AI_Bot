import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, PanelLeftClose, PanelLeftOpen, Cpu, PlayCircle, UserPlus, X } from 'lucide-react'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import SuggestedQuestions from './SuggestedQuestions'
import { API_BASE } from '../api'
import { getSessionId } from '../session'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi there! 👋 I'm the AI assistant representing Nagesh Bellary — Senior Product Owner & AI Solutions Architect.\n\nFeel free to ask me anything about his experience, technical skills, AI projects, leadership background, or career goals. I'm here to help you discover if Nagesh is the right fit for your team!",
}

const NUDGE_THRESHOLD = 3

export default function ChatInterface({ sidebarOpen, onToggleSidebar, videoExists, onOpenVideo, onOpenConnect }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [showNudge, setShowNudge] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (userMessageCount >= NUDGE_THRESHOLD && !nudgeDismissed) {
      setShowNudge(true)
    }
  }, [userMessageCount, nudgeDismissed])

  const autoResizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || isStreaming) return

    setInput('')
    setShowSuggestions(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg = { role: 'user', content: userText }
    setMessages(prev => [...prev, userMsg])
    setUserMessageCount(c => c + 1)
    setIsStreaming(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history, session_id: getSessionId() }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'error') throw new Error(parsed.error)

            if (parsed.type === 'sources') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], sources: parsed.sections }
                return updated
              })
            } else if (parsed.type === 'token') {
              assistantContent += parsed.content ?? ''
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent }
                return updated
              })
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, something went wrong: ${err.message}. Please try again.`,
        },
      ])
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }, [input, isStreaming, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm">
        <button
          onClick={onToggleSidebar}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100 shrink-0"
          title={sidebarOpen ? 'Hide profile' : 'Show profile'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm text-gray-900 leading-none truncate">Nagesh's AI Recruiter Bot</h1>
          <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">Powered by Ollama · llama3.2 · RAG</p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {videoExists && (
            <button
              onClick={onOpenVideo}
              title="Watch Nagesh's intro video"
              className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-indigo-600 border border-gray-300 hover:border-indigo-500/50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Watch Intro</span>
            </button>
          )}

          <button
            onClick={onOpenConnect}
            title="Connect with Nagesh"
            className="flex items-center gap-1.5 text-[11px] text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-2 py-1.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Connect</span>
          </button>

          <Cpu className="w-3.5 h-3.5 text-gray-400 hidden lg:block" />
          <span className="text-[10px] text-gray-400 hidden lg:block">100% Local</span>
          <span className="flex items-center gap-1.5 text-[11px] text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline">Online</span>
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Questions */}
      {showSuggestions && (
        <SuggestedQuestions onSelect={(q) => sendMessage(q)} />
      )}

      {/* Connect nudge */}
      {showNudge && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
          <p className="text-[11px] text-indigo-700">
            Enjoying the conversation? Leave your details so Nagesh can follow up.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenConnect}
              className="text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-2.5 py-1 transition-colors"
            >
              Connect
            </button>
            <button
              onClick={() => { setShowNudge(false); setNudgeDismissed(true) }}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white/80 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-gray-100 border border-gray-300 rounded-xl flex items-end transition-colors focus-within:border-indigo-500/60">
            <textarea
              ref={(el) => { textareaRef.current = el; inputRef.current = el; }}
              value={input}
              onChange={e => { setInput(e.target.value); autoResizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about experience, skills, projects, availability..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none disabled:opacity-50 leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20 shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-[10px] text-gray-400 mt-2 text-center hidden sm:block">
          Responses are AI-generated from Nagesh's actual profile data · Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
