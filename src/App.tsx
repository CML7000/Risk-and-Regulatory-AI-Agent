import React, { useState } from 'react'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import AnalysisResults, { AnalysisData, ChecklistItem } from './components/AnalysisResults'
import ComplianceChecklist from './components/ComplianceChecklist'
import { ShieldCheck, FileText, ListChecks, BarChart3 } from 'lucide-react'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  const handleAnalyze = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setAnalysisData(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`)
      }

      setAnalysisData(data)
      setChecklist(data.checklist || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
    )
  }

  const analysisWithChecklist: AnalysisData | null = analysisData
    ? { ...analysisData, checklist }
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Empty state / feature cards */}
        {!analysisData && !isLoading && (
          <div className="mb-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Streamline Your Compliance Review
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Upload a hospital policy or procedure document and receive an instant AI-powered
                compliance analysis with actionable recommendations.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <FeatureCard
                icon={<FileText className="w-6 h-6 text-blue-600" />}
                title="Smart Document Analysis"
                desc="Supports PDF, DOCX, and TXT formats. Extracts key policy provisions automatically."
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6 text-indigo-600" />}
                title="Regulatory Mapping"
                desc="Identifies HIPAA, Joint Commission, CMS, OSHA, and other applicable frameworks."
              />
              <FeatureCard
                icon={<ListChecks className="w-6 h-6 text-emerald-600" />}
                title="Action Checklist"
                desc="Generates a prioritized, interactive compliance checklist with export capability."
              />
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${analysisData ? 'lg:grid-cols-[1fr_2fr]' : ''}`}>
          {/* Left column: upload */}
          <div>
            <FileUpload onAnalyze={handleAnalyze} isLoading={isLoading} error={error} />

            {/* Instructions */}
            {!analysisData && (
              <div className="mt-6 bg-blue-900 text-white rounded-2xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5" />
                  How It Works
                </h3>
                <ol className="space-y-2.5 text-sm text-blue-100">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-white shrink-0">1.</span>
                    Upload a hospital policy, procedure, or compliance document (PDF, DOCX, or TXT).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-white shrink-0">2.</span>
                    Click &ldquo;Analyze Policy&rdquo; to trigger AI-powered analysis using Claude.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-white shrink-0">3.</span>
                    Review the summary, regulatory frameworks, and identified risk areas.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-white shrink-0">4.</span>
                    Work through the interactive compliance checklist and export it when done.
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Right column: results */}
          {analysisWithChecklist && (
            <div className="space-y-6">
              <AnalysisResults data={analysisWithChecklist} />
              <ComplianceChecklist
                items={checklist}
                onToggle={handleToggle}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-slate-400">
            Hospital Policy Compliance Assistant &mdash; For internal compliance review use only.
          </p>
          <p className="text-sm text-slate-400">Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  desc: string
}

function FeatureCard({ icon, title, desc }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="bg-slate-50 w-11 h-11 rounded-xl flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}

export default App
