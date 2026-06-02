import React, { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookMarked,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react'
import type { PolicyGap } from './AnalysisResults'

export type { PolicyGap }

interface PolicyGapsProps {
  gaps: PolicyGap[]
}

const severityConfig: Record<string, { badge: string; leftBar: string; label: string }> = {
  Critical: { badge: 'bg-red-50 text-red-700 border-red-200',     leftBar: 'bg-red-500',    label: 'Critical Gap' },
  High:     { badge: 'bg-orange-50 text-orange-700 border-orange-200', leftBar: 'bg-orange-500', label: 'High Priority' },
  Medium:   { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', leftBar: 'bg-yellow-400', label: 'Medium Priority' },
  Low:      { badge: 'bg-green-50 text-green-700 border-green-200',  leftBar: 'bg-green-500',  label: 'Low Priority' },
}

const sourceTypeColors: Record<string, string> = {
  Regulation:    'bg-red-50 text-red-700 border-red-200',
  Law:           'bg-red-50 text-red-700 border-red-200',
  Standard:      'bg-blue-50 text-blue-700 border-blue-200',
  Guidance:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Best Practice': 'bg-teal-50 text-teal-700 border-teal-200',
}

export const PolicyGaps: React.FC<PolicyGapsProps> = ({ gaps }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const criticalCount = gaps.filter(g => g.severity === 'Critical').length
  const highCount = gaps.filter(g => g.severity === 'High').length

  return (
    <div className="bg-white rounded-xl border border-slate-200 animate-slide-up">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Policy Gap Analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gaps identified against industry best practices and regulatory standards
            </p>
          </div>
        </div>

        {/* Summary pill counts */}
        <div className="flex items-center gap-2 flex-wrap">
          {criticalCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-red-50 text-red-700 border-red-200">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-orange-50 text-orange-700 border-orange-200">
              {highCount} High
            </span>
          )}
          <span className="text-xs text-slate-400">
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mx-6 mt-4 mb-2 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
        <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Gaps are identified by comparing your policy against publicly available regulatory and
          clinical best-practice sources. Always verify citations against the source document before
          acting. This is not legal advice.
        </p>
      </div>

      {/* Gap list */}
      <div className="p-6 pt-3 space-y-3">
        {gaps.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No gaps identified.</p>
        )}

        {gaps.map((gap, index) => {
          const cfg = severityConfig[gap.severity] || severityConfig.Medium
          const isOpen = expanded.has(gap.id)

          return (
            <div key={gap.id} className="rounded-lg border border-slate-200 overflow-hidden">
              {/* Collapsed row — always visible */}
              <button
                onClick={() => toggle(gap.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                {/* Severity bar */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.leftBar}`} />

                {/* Number badge */}
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800 leading-snug">
                      {gap.title}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {gap.description}
                  </p>
                  {/* Source org pills — always visible */}
                  {gap.sources.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {gap.sources.map((s, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {s.organization}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expand chevron */}
                <div className="flex-shrink-0 text-slate-400 mt-0.5">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4 bg-white">

                  {/* Full description */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      What's Missing
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{gap.description}</p>
                  </div>

                  {/* Impact */}
                  {gap.impact && (
                    <div className="rounded-md border border-red-100 bg-red-50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <p className="text-xs font-semibold text-red-700">Potential Impact</p>
                      </div>
                      <p className="text-sm text-red-800 leading-relaxed">{gap.impact}</p>
                    </div>
                  )}

                  {/* Recommendation */}
                  {gap.recommendation && (
                    <div className="rounded-md border border-teal-100 bg-teal-50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-teal-600" />
                        <p className="text-xs font-semibold text-teal-700">Recommended Action</p>
                      </div>
                      <p className="text-sm text-teal-900 leading-relaxed">{gap.recommendation}</p>
                    </div>
                  )}

                  {/* Authoritative sources */}
                  {gap.sources.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <BookMarked className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Authoritative Sources
                        </p>
                      </div>
                      <div className="space-y-2">
                        {gap.sources.map((source, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="text-xs font-semibold text-slate-700">
                                  {source.organization}
                                </span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${sourceTypeColors[source.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                  {source.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{source.title}</p>
                            </div>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium mt-0.5"
                              >
                                View
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PolicyGaps
