import React from 'react'
import { ClipboardCheck, ShieldAlert, Table2, GitCompare, MessageSquare } from 'lucide-react'

export type Mode = 'checklist' | 'gaps' | 'matrix' | 'compare' | 'ask'

interface ModeCard {
  id: Mode
  icon: React.ReactNode
  title: string
  description: string
}

const MODES: ModeCard[] = [
  {
    id: 'checklist',
    icon: <ClipboardCheck className="w-5 h-5" />,
    title: 'Compliance Checklist',
    description: 'Generate a prioritized audit checklist with step-by-step testing instructions and source-of-truth locations.',
  },
  {
    id: 'gaps',
    icon: <ShieldAlert className="w-5 h-5" />,
    title: 'Risks & Gaps',
    description: 'Identify gaps between this policy and industry best practices, with citations from CMS, CDC, HRSA, HHS, and regulatory bodies.',
  },
  {
    id: 'matrix',
    icon: <Table2 className="w-5 h-5" />,
    title: 'Fill Risk Matrix',
    description: "Upload your organization's risk matrix template and let the AI complete it based on this policy.",
  },
  {
    id: 'compare',
    icon: <GitCompare className="w-5 h-5" />,
    title: 'Compare Policy Versions',
    description: 'Upload previous versions of this policy to identify material changes and new compliance risks.',
  },
  {
    id: 'ask',
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Ask a Question',
    description: 'Type any compliance question about this policy and get a plain-language answer.',
  },
]

interface ModeSelectorProps {
  selected: Mode | null
  onSelect: (mode: Mode) => void
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Choose an Analysis Mode</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {MODES.map(mode => {
          const isSelected = selected === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`
                text-left rounded-lg border-2 p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400
                ${isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <div className={`mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                {mode.icon}
              </div>
              <div className={`font-semibold text-sm mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                {mode.title}
              </div>
              <div className="text-xs text-slate-500 leading-snug">
                {mode.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ModeSelector
