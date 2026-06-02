import React from 'react'
import { ShieldCheck } from 'lucide-react'

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
        <div className="flex-shrink-0 bg-white/15 rounded-xl p-3">
          <ShieldCheck className="w-8 h-8 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">
            Hospital Policy Compliance Assistant
          </h1>
          <p className="text-blue-200 text-sm mt-0.5 font-medium">
            AI-Powered Risk &amp; Regulatory Analysis
          </p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 text-sm text-blue-100">
          <ShieldCheck className="w-4 h-4" />
          <span>Powered by Claude AI</span>
        </div>
      </div>
    </header>
  )
}

export default Header
