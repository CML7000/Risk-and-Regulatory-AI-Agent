import React, { useState } from 'react'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import ModeSelector, { Mode } from './components/ModeSelector'
import ComplianceChecklistPanel from './components/ComplianceChecklistPanel'
import GapsPanel from './components/GapsPanel'
import RiskMatrixPanel from './components/RiskMatrixPanel'
import VersionComparePanel from './components/VersionComparePanel'
import QuestionPanel from './components/QuestionPanel'
import { FileText, AlertTriangle } from 'lucide-react'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [policyText, setPolicyText] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null)

  const handleAnalyze = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setSummary(null)
    setPolicyText(null)
    setTruncated(false)
    setSelectedMode(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        let errMsg = `Server error: ${res.status}`
        try {
          const errData = await res.json()
          errMsg = errData.error || errMsg
        } catch { /* non-JSON */ }
        throw new Error(errMsg)
      }

      const data = await res.json()
      setSummary(data.summary || '')
      setPolicyText(data.policyText || '')
      setTruncated(data.truncated || false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const ready = !!summary && !!policyText

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Upload section — always visible */}
        <FileUpload onAnalyze={handleAnalyze} isLoading={isLoading} error={error} />

        {/* Truncation warning */}
        {truncated && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800">
              <span className="font-semibold">Document was truncated.</span>{' '}
              Your file exceeds 50,000 characters. Only the first portion was analyzed — results may be incomplete.
            </p>
          </div>
        )}

        {/* Summary card */}
        {ready && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Policy Summary
            </h2>
            <p className="text-slate-700 text-sm leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Mode selector */}
        {ready && (
          <ModeSelector selected={selectedMode} onSelect={setSelectedMode} />
        )}

        {/* Mode panels */}
        {ready && selectedMode === 'checklist' && (
          <ComplianceChecklistPanel policyText={policyText!} />
        )}
        {ready && selectedMode === 'gaps' && (
          <GapsPanel policyText={policyText!} />
        )}
        {ready && selectedMode === 'matrix' && (
          <RiskMatrixPanel policyText={policyText!} />
        )}
        {ready && selectedMode === 'compare' && (
          <VersionComparePanel />
        )}
        {ready && selectedMode === 'ask' && (
          <QuestionPanel policyText={policyText!} />
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-4">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-400">
            For internal compliance review use only. Not legal advice.
          </p>
          <p className="text-xs text-slate-400">Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  )
}

export default App
