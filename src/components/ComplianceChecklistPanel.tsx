import React, { useState } from 'react'
import {
  ClipboardCheck, CheckSquare, Square, Download, Filter,
  TrendingUp, ChevronDown, ChevronUp, Loader2, Database,
} from 'lucide-react'

export interface SourceOfTruth {
  system: string
  location: string
  steps: string[]
  whatToLookFor: string
}

export interface ChecklistItem {
  id: string
  title: string
  description: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  category: string
  completed: boolean
  sourceOfTruth?: SourceOfTruth | null
}

interface Props {
  policyText: string
}

type Priority = 'All' | 'Critical' | 'High' | 'Medium' | 'Low'

const priorityConfig: Record<string, { badge: string; leftBar: string }> = {
  Critical: { badge: 'bg-red-50 text-red-700 border-red-200',         leftBar: 'bg-red-500' },
  High:     { badge: 'bg-orange-50 text-orange-700 border-orange-200', leftBar: 'bg-orange-500' },
  Medium:   { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', leftBar: 'bg-yellow-400' },
  Low:      { badge: 'bg-green-50 text-green-700 border-green-200',    leftBar: 'bg-green-500' },
}

const SYSTEM_BADGE: Record<string, string> = {
  'Epic EMR':            'bg-blue-100 text-blue-800 border-blue-200',
  'Cerner EMR':          'bg-blue-100 text-blue-800 border-blue-200',
  'Workday':             'bg-purple-100 text-purple-800 border-purple-200',
  'Registration System': 'bg-green-100 text-green-800 border-green-200',
  'MCR':                 'bg-orange-100 text-orange-800 border-orange-200',
  'Policy Repository':   'bg-slate-100 text-slate-700 border-slate-200',
  'Medical Records':     'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Credentialing System':'bg-teal-100 text-teal-800 border-teal-200',
  'Billing System':      'bg-red-100 text-red-800 border-red-200',
  'Other':               'bg-slate-100 text-slate-700 border-slate-200',
}

function systemBadgeClass(system: string): string {
  return SYSTEM_BADGE[system] || SYSTEM_BADGE['Other']
}

const PRIORITY_ORDER: Priority[] = ['All', 'Critical', 'High', 'Medium', 'Low']

const ComplianceChecklistPanel: React.FC<Props> = ({ policyText }) => {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [filter, setFilter] = useState<Priority>('All')
  const [expandedSot, setExpandedSot] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ran, setRan] = useState(false)

  const runChecklist = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/compliance-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setItems((data.checklist || []).map((item: ChecklistItem) => ({ ...item, completed: false })))
      setRan(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  const toggleSot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedSot(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const filtered = filter === 'All' ? items : items.filter(i => i.priority === filter)
  const countFor = (p: Priority) => p === 'All' ? items.length : items.filter(i => i.priority === p).length

  const handleExport = () => {
    const lines: string[] = [
      'HOSPITAL POLICY COMPLIANCE CHECKLIST',
      '====================================',
      `Generated: ${new Date().toLocaleDateString()}`,
      `Progress: ${completedCount}/${totalCount} items completed (${progressPct}%)`,
      '',
    ]
    for (const priority of ['Critical', 'High', 'Medium', 'Low'] as Priority[]) {
      const group = items.filter(i => i.priority === priority)
      if (!group.length) continue
      lines.push(`--- ${priority.toUpperCase()} PRIORITY ---`)
      for (const item of group) {
        lines.push(`[${item.completed ? 'X' : ' '}] ${item.title}`)
        lines.push(`    Category: ${item.category}`)
        lines.push(`    ${item.description}`)
        if (item.sourceOfTruth) {
          lines.push(`    SYSTEM: ${item.sourceOfTruth.system}`)
          lines.push(`    LOCATION: ${item.sourceOfTruth.location}`)
          item.sourceOfTruth.steps.forEach((s, i) => lines.push(`      ${i + 1}. ${s}`))
          lines.push(`    WHAT TO LOOK FOR: ${item.sourceOfTruth.whatToLookFor}`)
        }
        lines.push('')
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compliance-checklist.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Compliance Checklist</h2>
            <p className="text-xs text-slate-500 mt-0.5">Prioritized audit items with source-of-truth navigation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ran && items.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
          <button
            onClick={runChecklist}
            disabled={isLoading}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md transition-colors ${
              isLoading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
            {isLoading ? 'Generating…' : ran ? 'Re-run' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {ran && items.length > 0 && (
        <div className="p-6 space-y-5">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{completedCount} of {totalCount} items completed</span>
              </div>
              <span className={`text-xs font-semibold ${progressPct === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                {progressPct}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {PRIORITY_ORDER.map(p => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors border ${
                  filter === p
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p} <span className={`ml-0.5 ${filter === p ? 'text-blue-200' : 'text-slate-400'}`}>({countFor(p)})</span>
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="space-y-3">
            {filtered.map(item => {
              const cfg = priorityConfig[item.priority] || priorityConfig.Low
              const sotOpen = expandedSot.has(item.id)
              return (
                <div key={item.id} className={`rounded-lg border border-slate-200 overflow-hidden transition-opacity ${item.completed ? 'opacity-60' : ''}`}>
                  {/* Main row */}
                  <div
                    onClick={() => toggle(item.id)}
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.leftBar}`} />
                    <div className="flex-shrink-0 mt-0.5">
                      {item.completed
                        ? <CheckSquare className="w-[18px] h-[18px] text-blue-600" />
                        : <Square className="w-[18px] h-[18px] text-slate-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className={`font-medium text-sm leading-snug ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.badge}`}>
                            {item.priority}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed ${item.completed ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Source of Truth */}
                  {item.sourceOfTruth && (
                    <div className="border-t border-slate-100">
                      <button
                        onClick={(e) => toggleSot(item.id, e)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                      >
                        <Database className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex-1">Source of Truth</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border mr-1 ${systemBadgeClass(item.sourceOfTruth.system)}`}>
                          {item.sourceOfTruth.system}
                        </span>
                        {sotOpen ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />}
                      </button>

                      {sotOpen && (
                        <div className="px-4 pb-4 pt-3 bg-white space-y-4">
                          {/* System + navigation path */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Navigation Path</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.sourceOfTruth.location.split(/->|→/).map((part, i, arr) => (
                                <React.Fragment key={i}>
                                  <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded">
                                    {part.trim()}
                                  </span>
                                  {i < arr.length - 1 && <span className="text-slate-300 text-xs">›</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>

                          {/* Steps */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Step-by-Step Instructions</p>
                            <ol className="space-y-1.5">
                              {item.sourceOfTruth.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* What to look for */}
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold text-amber-800 mb-1">What to Look For</p>
                            <p className="text-sm text-amber-900 leading-relaxed">{item.sourceOfTruth.whatToLookFor}</p>
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
      )}

      {!ran && !isLoading && (
        <div className="px-6 py-10 text-center text-slate-400 text-sm">
          Click "Run Analysis" to generate the compliance checklist for this policy.
        </div>
      )}

      {isLoading && (
        <div className="px-6 py-10 flex items-center justify-center gap-3 text-blue-600 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          Generating checklist…
        </div>
      )}
    </div>
  )
}

export default ComplianceChecklistPanel
