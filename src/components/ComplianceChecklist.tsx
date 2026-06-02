import React, { useState } from 'react'
import { CheckSquare, Square, Download, Filter, TrendingUp } from 'lucide-react'
import type { ChecklistItem } from './AnalysisResults'

interface ComplianceChecklistProps {
  items: ChecklistItem[]
  onToggle: (id: string) => void
}

type Priority = 'All' | 'Critical' | 'High' | 'Medium' | 'Low'

const priorityConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  High: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  Medium: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  Low: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
}

const PRIORITY_ORDER: Priority[] = ['All', 'Critical', 'High', 'Medium', 'Low']

const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ items, onToggle }) => {
  const [filter, setFilter] = useState<Priority>('All')

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filtered = filter === 'All' ? items : items.filter(i => i.priority === filter)

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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-slide-up">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          Compliance Checklist
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Checklist
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <TrendingUp className="w-4 h-4" />
            <span>
              {completedCount} of {totalCount} items completed
            </span>
          </div>
          <span
            className={`text-sm font-semibold ${
              progressPct === 100 ? 'text-green-600' : 'text-blue-700'
            }`}
          >
            {progressPct}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct === 100 ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <Filter className="w-4 h-4 text-slate-400 mr-1" />
        {PRIORITY_ORDER.map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
              filter === p
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
            }`}
          >
            {p}
            <span className={`ml-1.5 ${filter === p ? 'text-blue-200' : 'text-slate-400'}`}>
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
          return (
            <div
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`
                flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200
                ${item.completed
                  ? 'bg-slate-50 border-slate-200 opacity-70'
                  : `${cfg.bg} ${cfg.border}`
                }
                hover:shadow-sm
              `}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0 mt-0.5">
                {item.completed ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-semibold text-sm ${
                      item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    {item.priority}
                  </span>
                  <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                </div>
                <p
                  className={`text-sm mt-1 leading-relaxed ${
                    item.completed ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ComplianceChecklist
