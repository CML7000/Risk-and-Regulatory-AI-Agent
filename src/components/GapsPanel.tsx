import React, { useState } from 'react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { PolicyGaps } from './PolicyGaps'
import type { PolicyGap } from './PolicyGaps'

interface Props {
  policyText: string
}

const GapsPanel: React.FC<Props> = ({ policyText }) => {
  const [gaps, setGaps] = useState<PolicyGap[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ran, setRan] = useState(false)

  const runGaps = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setGaps(data.gaps || [])
      setRan(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Run bar */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Risks &amp; Gaps Analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gaps vs. CMS, CDC, HRSA, HHS, OSHA, Joint Commission, and regulatory bodies
            </p>
          </div>
        </div>
        <button
          onClick={runGaps}
          disabled={isLoading}
          className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-colors ${
            isLoading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          {isLoading ? 'Analyzing…' : ran ? 'Re-run' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 py-10 flex items-center justify-center gap-3 text-blue-600 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          Analyzing gaps…
        </div>
      )}

      {!ran && !isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 py-10 text-center text-slate-400 text-sm">
          Click "Run Analysis" to identify regulatory gaps for this policy.
        </div>
      )}

      {ran && !isLoading && <PolicyGaps gaps={gaps} />}
    </div>
  )
}

export default GapsPanel
