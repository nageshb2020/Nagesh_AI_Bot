import { Sparkles } from 'lucide-react'

const QUESTIONS = [
  "What AI products has Nagesh shipped?",
  "Tell me about his technical skills",
  "What leadership experience does he have?",
  "What are his top achievements?",
  "Is he open to new opportunities?",
  "What's his education background?",
  "What makes him stand out as a candidate?",
  "Walk me through his most impactful project",
]

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="px-4 pb-3 border-t border-gray-200 pt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-indigo-500" />
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Suggested Questions</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-[11px] px-3 py-1.5 rounded-full border border-gray-300 text-gray-500 hover:border-indigo-500/60 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
