import React, { useRef, useState } from 'react'
import { Table2, Upload, Loader2, Download, AlertTriangle } from 'lucide-react'

interface MatrixRow {
  cells: string[]
  risk: string
  likelihood: string
  impact: string
  mitigation: string
}

interface FilledMatrix {
  headers: string[]
  rows: MatrixRow[]
}

interface Props {
  policyText: string
}

const riskColor: Record<string, string> = {
  High:   'bg-red-50 border-red-200',
  Medium: 'bg-yellow-50 border-yellow-200',
  Low:    'bg-green-50 border-green-200',
}

const ACCEPTED_EXTS = ['.pdf', '.docx', '.txt', '.csv']

function isAccepted(file: File) {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTS.includes(ext)
}

const RiskMatrixPanel: React.FC<Props> = ({ policyText }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [matrixFile, setMatrixFile] = useState<File | null>(null)
  const [filledMatrix, setFilledMatrix] = useState<FilledMatrix | null>(null)
  const [rawText, setRawText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeError, setTypeError] = useState(false)
  const [ran, setRan] = useState(false)

  const handleFile = (file: File) => {
    if (!isAccepted(file)) { setTypeError(true); return }
    setTypeError(false)
    setMatrixFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const runMatrix = async () => {
    if (!matrixFile) return
    setIsLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('matrixFile', matrixFile)
      fd.append('policyText', policyText)
      const res = await fetch('/api/fill-matrix', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error: ${res.status}`)
      }
      const data = await res.json()
      setFilledMatrix(data.filledMatrix || null)
      setRawText(data.rawText || '')
      setRan(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadCsv = () => {
    if (!filledMatrix) return
    const lines = [filledMatrix.headers.join(',')]
    for (const row of filledMatrix.rows) {
      lines.push(row.cells.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'risk-matrix-filled.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasTable = filledMatrix && filledMatrix.headers.length > 0 && filledMatrix.rows.length > 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
            <Table2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Fill Risk Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload your template and AI will populate it from the policy</p>
          </div>
        </div>
        {ran && hasTable && (
          <button
            onClick={downloadCsv}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* File upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg cursor-pointer transition-colors p-6 text-center ${
            matrixFile ? 'border-green-400 bg-green-50/60' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          {matrixFile ? (
            <p className="text-sm font-medium text-slate-700">{matrixFile.name} <span className="text-slate-400 font-normal">— click to replace</span></p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">Drop your risk matrix template here</p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT, or CSV · Click to browse</p>
            </>
          )}
        </div>

        {typeError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Only PDF, DOCX, TXT, or CSV files are accepted.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={runMatrix}
          disabled={!matrixFile || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            matrixFile && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Filling Matrix…</> : <><Table2 className="w-4 h-4" /> Fill Risk Matrix</>}
        </button>

        {/* Results */}
        {ran && !isLoading && (
          <div className="animate-slide-up">
            {hasTable ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {filledMatrix!.headers.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filledMatrix!.rows.map((row, ri) => {
                      const lh = (row.likelihood || '').toLowerCase()
                      const color = lh === 'high' ? riskColor.High : lh === 'medium' ? riskColor.Medium : riskColor.Low
                      return (
                        <tr key={ri} className={`border-b border-slate-100 last:border-0 ${color}`}>
                          {row.cells.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2.5 text-xs text-slate-700 align-top">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : rawText ? (
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-wrap overflow-x-auto">
                {rawText}
              </pre>
            ) : (
              <p className="text-center text-slate-400 text-sm py-6">No matrix data returned.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RiskMatrixPanel
