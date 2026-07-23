import { useState, useEffect } from 'react'
import { MapPin, Mail, Linkedin, Github, Award, Briefcase, Code2, Star, FileText, PlayCircle } from 'lucide-react'
import ResumeDownloadButton from './ResumeDownloadButton'
import { API_BASE } from '../api'

function SkeletonBlock({ className }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function Skeleton() {
  return (
    <div className="h-full bg-white border-r border-gray-200 p-5 space-y-6">
      <div className="flex flex-col items-center gap-3 pt-4">
        <SkeletonBlock className="w-20 h-20 rounded-full" />
        <SkeletonBlock className="w-36 h-4" />
        <SkeletonBlock className="w-48 h-3" />
        <SkeletonBlock className="w-28 h-3" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="w-24 h-3" />
          <SkeletonBlock className="w-full h-3" />
          <SkeletonBlock className="w-4/5 h-3" />
        </div>
      ))}
    </div>
  )
}

export default function ProfileCard({ profile, videoExists, onOpenVideo }) {
  const [resumeMode, setResumeMode] = useState(null) // 'resume' | 'profile_json' | null

  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then(r => r.json())
      .then(d => setResumeMode(d.mode))
      .catch(() => {})
  }, [])

  if (!profile) return <Skeleton />

  const { personal, skills, experience, certifications, achievements } = profile

  return (
    <aside className="h-full bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
      {/* Hero Section */}
      <div className="relative p-5 text-center border-b border-gray-200">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-purple-50/40 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-xl font-bold text-white shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/20">
            {personal.avatar}
          </div>

          <h1 className="font-bold text-base text-gray-900 leading-tight">{personal.name}</h1>
          <p className="text-indigo-600 text-xs font-medium mt-1 leading-snug px-2">{personal.title}</p>

          <div className="flex items-center justify-center gap-1.5 mt-2 text-gray-500 text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{personal.location}</span>
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <a
              href={`mailto:${personal.email}`}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              title="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
            <a
              href={`https://${personal.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={`https://${personal.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-xs font-medium">Open to Opportunities</p>
          </div>

          {videoExists && (
            <button
              onClick={onOpenVideo}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 border border-gray-300 hover:border-indigo-500/50 rounded-lg px-3 py-2 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Watch Intro Video
            </button>
          )}

          <ResumeDownloadButton />

          {resumeMode === 'resume' && (
            <div className="mt-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-center gap-1.5">
              <FileText className="w-3 h-3 text-indigo-500" />
              <p className="text-indigo-600 text-[10px] font-medium">Resume-powered RAG</p>
            </div>
          )}
        </div>
      </div>

      {/* Experience */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Experience</h3>
        </div>
        <div className="space-y-3">
          {experience?.slice(0, 3).map((exp, i) => (
            <div key={i} className="group">
              <p className="text-xs font-medium text-gray-800 leading-snug group-hover:text-indigo-600 transition-colors">
                {exp.title}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {exp.company} · {exp.period}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AI & ML Skills */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">AI & ML Skills</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills?.ai_ml?.map(s => (
            <span
              key={s}
              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium border border-indigo-200"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {skills?.technical?.slice(0, 9).map(s => (
            <span
              key={s}
              className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] border border-gray-200"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Certifications</h3>
        </div>
        <div className="space-y-2.5">
          {certifications?.map((cert, i) => (
            <div key={i}>
              <p className="text-[11px] font-medium text-gray-700 leading-snug">{cert.name}</p>
              <p className="text-[10px] text-gray-500">{cert.issuer} · {cert.year}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Highlights</h3>
        </div>
        <div className="space-y-2">
          {achievements?.slice(0, 3).map((a, i) => (
            <p key={i} className="text-[11px] text-gray-500 leading-snug pl-3 border-l border-indigo-300">
              {a}
            </p>
          ))}
        </div>
      </div>
    </aside>
  )
}
