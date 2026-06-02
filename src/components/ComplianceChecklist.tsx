import React, { useState } from 'react'
import { CheckSquare, Square, Download, Filter, TrendingUp, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import type { ChecklistItem } from './AnalysisResults'

interface ComplianceChecklistProps {
  items: ChecklistItem[]
  onToggle: (id: string) => void
}

type Priority = 'All' | 'Critical' | 'High' | 'Medium' | 'Low'

const priorityConfig: Record<string, { badge: string; leftBar: string }> = {
  Critical: { badge: 'bg-red-50 text-red-700 border-red-200',   leftBar: 'bg-red-500' },
  High:     { badge: 'bg-orange-50 text-orange-700 border-orange-200', leftBar: 'bg-orange-500' },
  Medium:   { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', leftBar: 'bg-yellow-400' },
  Low:      { badge: 'bg-green-50 text-green-700 border-green-200',  leftBar: 'bg-green-500' },
}

const PRIORITY_ORDER: Priority[] = ['All', 'Critical', 'High', 'Medium', 'Low']

const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ items, onToggle }) => {
  const [filter, setFilter] = useState<Priority>('All')
  const [expandedEmr, setExpandedEmr] = useState<Set<string>>(new Set())

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filtered = filter === 'All' ? items : items.filter(i => i.priority === filter)

  const toggleEmr = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedEmr(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleExport = () => {
    const lines: string[] = [
      'HOSPITAL POLICY COMPLIANCE CHECKLIST',
      '====================================',
      `Generated: ${new Date().toLocaleDateString()}`,
      `Progress: ${completedCount}/${totalCount} items completed (${progressPct}%)`,
      '',
    ]

    const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low']
    for (const priority of priorities) {
      const group = items.filter(i => i.priority === priority)
      if (group.length === 0) continue
      lines.push(`--- ${priority.toUpperCase()} PRIORITY ---`)
      for (const item of group) {
        lines.push(`[${item.completed ? 'X' : ' '}] ${item.title}`)
        lines.push(`    Category: ${item.category}`)
        lines.push(`    ${item.description}`)
        if (item.emrLocation) {
          lines.push(`    WHERE TO FIND IN EMR: ${item.emrLocation.section}`)
          item.emrLocation.steps.forEach((s, i) => lines.push(`      ${i + 1}. ${s}`))
          lines.push(`    WHAT TO LOOK FOR: ${item.emrLocation.whatToLookFor}`)
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

  const countForPriority = (p: Priority) =>
    p === 'All' ? items.length : items.filter(i => i.priority === p).length

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-slide-up">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          Compliance Checklist
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Checklist
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
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
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
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
            {p}
            <span className={`ml-1 ${filter === p ? 'text-blue-200' : 'text-slate-400'}`}>
              ({countForPriority(p)})
            </span>
          </button>
        ))}
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No items for this priority level.
          </div>
        )}
        {filtered.map(item => {
          const cfg = priorityConfig[item.priority] || priorityConfig.Low
          const emrOpen = expandedEmr.has(item.id)

          return (
            <div
              key={item.id}
              className={`rounded-lg border border-slate-200 overflow-hidden transition-all duration-200 ${
                item.completed ? 'opacity-60' : ''
              }`}
            >
              {/* Main row — clickable to toggle checkbox */}
              <div
                onClick={() => onToggle(item.id)}
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                {/* Priority left bar */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.leftBar}`} />

                {/* Checkbox */}
                <div className="flex-shrink-0 mt-0.5">
                  {item.completed ? (
                    <CheckSquare className="w-4.5 h-4.5 text-blue-600 w-[18px] h-[18px]" />
                  ) : (
                    <Square className="w-[18px] h-[18px] text-slate-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className={`font-medium text-sm leading-snug ${
                      item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}>
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
                  <p className={`text-sm mt-1 leading-relaxed ${
                    item.completed ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>

              {/* EMR Location section */}
              {item.emrLocation && (
                <div className="border-t border-slate-100">
                  {/* Toggle button */}
                  <button
                    onClick={(e) => toggleEmr(item.id, e)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                  >
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">Where to find this in the EMR</span>
                    <span className="text-blue-400 text-xs font-normal mr-1 truncate max-w-[200px]">
                      {item.emrLocation.section}
                    </span>
                    {emrOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                    )}
                  </button>

                  {/* Expanded EMR detail */}
                  {emrOpen && (
                    <div className="px-4 pb-4 pt-3 bg-white space-y-4">

                      {/* Navigation path */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                          EMR Location
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.emrLocation.section.split('→').map((part, i, arr) => (
                            <React.Fragment key={i}>
                              <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded">
                                {part.trim()}
                              </span>
                              {i < arr.length - 1 && (
                                <span className="text-slate-300 text-xs">›</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Step-by-step instructions */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Step-by-Step Instructions
                        </p>
                        <ol className="space-y-1.5">
                          {item.emrLocation.steps.map((step, i) => (
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
                        <p className="text-xs font-semibold text-amber-800 mb-1">
                          What to Look For
                        </p>
                        <p className="text-sm text-amber-900 leading-relaxed">
                          {item.emrLocation.whatToLookFor}
                        </p>
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

export default ComplianceChecklist
