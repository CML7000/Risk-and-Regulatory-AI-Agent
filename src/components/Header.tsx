import React from 'react'
import { ShieldCheck } from 'lucide-react'

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <div className="flex-shrink-0 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
          <ShieldCheck className="w-6 h-6 text-blue-600" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-tight">
            Hospital Policy Compliance Assistant
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            AI-Powered Risk &amp; Regulatory Analysis
          </p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-slate-400 border border-slate-200 rounded-md px-3 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Powered by Claude AI</span>
        </div>
      </div>
    </header>
  )
}

export default Header
