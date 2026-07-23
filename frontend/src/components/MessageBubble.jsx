import { Bot, User, BookMarked } from 'lucide-react'

export default function MessageBubble({ message, isStreaming }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 animate-fade-in-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser
          ? 'bg-indigo-600'
          : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20'
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-white" />
        }
      </div>

      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-500/10'
          : 'bg-gray-100 text-gray-900 rounded-tl-sm border border-gray-200 shadow-sm'
      } ${isStreaming && !isUser ? 'cursor-blink' : ''}`}
      >
        {message.content
          ? <span className="whitespace-pre-wrap">{message.content}</span>
          : <span className="text-gray-500 italic text-xs">Thinking...</span>
        }

        {!isUser && message.sources?.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-200">
            <BookMarked className="w-3 h-3 text-gray-400 shrink-0" />
            {message.sources.map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
