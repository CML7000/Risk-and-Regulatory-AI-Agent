import React, { useRef, useState } from 'react'
import { GitCompare, Upload, X, Loader2, AlertTriangle, Plus } from 'lucide-react'

interface VersionChange {
  section: string
  type: 'Added' | 'Removed' | 'Modified' | 'Risk Introduced' | 'Risk Removed'
  before: string | null
  after: string | null
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'None'
  explanation: string
}

interface CompareResult {
  versionCount: number
  summary: string
  changes: VersionChange[]
}

const ACCEPTED_EXTS = ['.pdf', '.docx', '.txt']

function isAccepted(file: File) {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTS.includes(ext)
}

const TYPE_BADGE: Record<string, string> = {
  'Added':           'bg-green-100 text-green-800 border-green-200',
  'Removed':         'bg-red-100 text-red-800 border-red-200',
  'Modified':        'bg-blue-100 text-blue-800 border-blue-200',
  'Risk Introduced': 'bg-orange-100 text-orange-800 border-orange-200',
  'Risk Removed':    'bg-teal-100 text-teal-800 border-teal-200',
}

const RISK_BADGE: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High:     'bg-orange-50 text-orange-700 border-orange-200',
  Medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  Low:      'bg-green-50 text-green-700 border-green-200',
  None:     'bg-slate-50 text-slate-500 border-slate-200',
}

const ALL_TYPES = ['Added', 'Removed', 'Modified', 'Risk Introduced', 'Risk Removed'] as const
type FilterType = 'All' | typeof ALL_TYPES[number]

const VersionComparePanel: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState<CompareResult | null>(null)
  const [filter, setFilter] = useState<FilterType>('All')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeError, setTypeError] = useState(false)

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const valid = arr.filter(isAccepted)
    if (valid.length < arr.length) setTypeError(true)
    else setTypeError(false)
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))].slice(0, 5)
    })
  }

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name))

  const runCompare = async () => {
    if (files.length < 2) return
    setIsLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('version', f))
      const res = await fetch('/api/compare-versions', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = result
    ? (filter === 'All' ? result.changes : result.changes.filter(c => c.type === filter))
    : []

  return (
    <div className="bg-white rounded-xl border border-slate-200 animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-2">
          <GitCompare className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Compare Policy Versions</h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload 2-5 versions to identify material changes and new compliance risks</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Upload zone */}
        <div
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-lg cursor-pointer transition-colors p-5 text-center border-slate-200 hover:border-blue-400 hover:bg-slate-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files) }}
          />
          <Plus className="w-5 h-5 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Add version files (PDF, DOCX, TXT)</p>
          <p className="text-xs text-slate-400 mt-1">Up to 5 files — drag & drop or click</p>
        </div>

        {typeError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Only PDF, DOCX, and TXT files are accepted.
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={f.name} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-slate-700 truncate">{f.name}</span>
                <button onClick={() => removeFile(f.name)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={runCompare}
          disabled={files.length < 2 || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            files.length >= 2 && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing Versions…</>
            : <><GitCompare className="w-4 h-4" /> Compare {files.length} Version{files.length !== 1 ? 's' : ''}</>
          }
        </button>
        {files.length < 2 && files.length > 0 && (
          <p className="text-xs text-slate-400 text-center">Add at least 2 version files to compare.</p>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="space-y-4 animate-slide-up">
            {/* Summary */}
            {result.summary && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overall Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* Filter by type */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', ...ALL_TYPES] as FilterType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                    filter === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Changes list */}
            <div className="space-y-3">
              {filtered.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No changes of this type.</p>
              )}
              {filtered.map((change, i) => (
                <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 flex-wrap">
                    <span className="font-medium text-sm text-slate-800 flex-1">{change.section}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${TYPE_BADGE[change.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {change.type}
                    </span>
                    {change.riskLevel !== 'None' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${RISK_BADGE[change.riskLevel] || RISK_BADGE.None}`}>
                        {change.riskLevel} Risk
                      </span>
                    )}
                  </div>
                  {/* Before / After */}
                  {(change.before || change.after) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      <div className="p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Before</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                          {change.before || <span className="italic text-slate-300">None</span>}
                        </p>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">After</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                          {change.after || <span className="italic text-slate-300">Removed</span>}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Explanation */}
                  {change.explanation && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Compliance Implication</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{change.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VersionComparePanel
