import React, { useState } from 'react'
import { MessageSquare, Loader2, Send, BookOpen } from 'lucide-react'

interface Citation {
  quote: string
  context: string
}

interface Props {
  policyText: string
}

const QuestionPanel: React.FC<Props> = ({ policyText }) => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [citations, setCitations] = useState<Citation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!question.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    setAnswer(null)
    setCitations([])
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyText, question }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setAnswer(data.answer || 'No answer available.')
      setCitations(data.citations || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Ask a Question</h2>
          <p className="text-xs text-slate-500 mt-0.5">Get a plain-language answer based on this policy document</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Textarea */}
        <div>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Does this policy address telehealth consent?"
            rows={3}
            disabled={isLoading}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-60 transition"
          />
          <p className="text-xs text-slate-400 mt-1">Press Ctrl+Enter to submit</p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!question.trim() || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            question.trim() && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting Answer…</>
            : <><Send className="w-4 h-4" /> Submit Question</>
          }
        </button>

        {/* Answer */}
        {answer && !isLoading && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Answer</p>
              <p className="text-sm text-slate-800 leading-relaxed">{answer}</p>
            </div>

            {citations.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Policy References</p>
                </div>
                <div className="space-y-2">
                  {citations.map((c, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <blockquote className="text-sm text-slate-700 italic border-l-2 border-blue-400 pl-3 mb-2 leading-relaxed">
                        "{c.quote}"
                      </blockquote>
                      {c.context && (
                        <p className="text-xs text-slate-500 leading-relaxed">{c.context}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionPanel
