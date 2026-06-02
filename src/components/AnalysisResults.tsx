import React from 'react'
import { FileText, Star, BookOpen, AlertTriangle, ChevronRight } from 'lucide-react'

interface Framework {
  name: string
  relevance: string
}

interface RiskArea {
  area: string
  description: string
  severity: 'High' | 'Medium' | 'Low'
}

export interface AnalysisData {
  summary: string
  highlights: string[]
  frameworks: Framework[]
  riskAreas: RiskArea[]
  checklist: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  category: string
  completed: boolean
  emrLocation?: {
    section: string        // e.g. "Patient Chart → Consent Forms"
    steps: string[]        // plain-language steps to find the record
    whatToLookFor: string  // what the compliance reviewer should look for / verify
  }
}

interface AnalysisResultsProps {
  data: AnalysisData
}

const severityColors: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
}

const severityDot: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 bg-white">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Policy Summary
        </h2>
        <div className="prose prose-slate max-w-none">
          {data.summary.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} className="text-slate-700 leading-relaxed mb-3 last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Key Highlights */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 bg-white">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          Key Policy Highlights
        </h2>
        <ul className="space-y-2.5">
          {data.highlights.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
              <span className="text-slate-700 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Regulatory Frameworks */}
      {data.frameworks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 bg-white">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Regulatory Frameworks Referenced
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.frameworks.map((fw, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-lg p-4"
              >
                <div className="font-semibold text-slate-800 text-sm mb-1">{fw.name}</div>
                <div className="text-slate-500 text-sm leading-relaxed">{fw.relevance}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Areas */}
      {data.riskAreas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 bg-white">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Identified Risk Areas
          </h2>
          <div className="space-y-3">
            {data.riskAreas.map((risk, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 bg-white"
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${severityDot[risk.severity] || 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800">{risk.area}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityColors[risk.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {risk.severity} Risk
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{risk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalysisResults
