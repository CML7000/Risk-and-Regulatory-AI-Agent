import React, { useRef, useState, useCallback } from 'react'
import { Upload, FileText, File, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

interface FileUploadProps {
  onAnalyze: (file: File) => Promise<void>
  isLoading: boolean
  error: string | null
}

const ACCEPTED_TYPES = ['.pdf', '.docx', '.txt']
const STATUS_MESSAGES = [
  'Extracting document text...',
  'Parsing policy structure...',
  'Running compliance analysis...',
  'Identifying regulatory frameworks...',
  'Generating compliance checklist...',
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(name: string) {
  if (name.endsWith('.pdf')) return <File className="w-5 h-5 text-red-500" />
  if (name.endsWith('.docx')) return <File className="w-5 h-5 text-blue-500" />
  return <FileText className="w-5 h-5 text-slate-500" />
}

const FileUpload: React.FC<FileUploadProps> = ({ onAnalyze, isLoading, error }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const statusInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext)) {
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleAnalyze = async () => {
    if (!selectedFile || isLoading) return
    setStatusIdx(0)
    statusInterval.current = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % STATUS_MESSAGES.length)
    }, 2200)
    try {
      await onAnalyze(selectedFile)
    } finally {
      if (statusInterval.current) clearInterval(statusInterval.current)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-600" />
        Upload Policy Document
      </h2>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${dragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : selectedFile
              ? 'border-green-400 bg-green-50'
              : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <div className="flex items-center gap-2 mt-1">
              {getFileIcon(selectedFile.name)}
              <span className="font-medium text-slate-800">{selectedFile.name}</span>
            </div>
            <span className="text-sm text-slate-500">
              {formatBytes(selectedFile.size)} &mdash; {selectedFile.name.split('.').pop()?.toUpperCase()}
            </span>
            <span className="text-xs text-blue-600 mt-1">Click to change file</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-blue-100 rounded-full p-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-lg">
                Drop your policy document here
              </p>
              <p className="text-slate-500 text-sm mt-1">
                or <span className="text-blue-600 font-medium">click to browse</span>
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              {ACCEPTED_TYPES.map(ext => (
                <span
                  key={ext}
                  className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {ext.toUpperCase().replace('.', '')}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400">Maximum file size: 20 MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Analysis Failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading status */}
      {isLoading && (
        <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fade-in">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Analyzing document...</p>
            <p className="text-sm text-blue-600 mt-0.5 transition-all duration-500">
              {STATUS_MESSAGES[statusIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedFile || isLoading}
        className={`
          mt-4 w-full py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-200
          flex items-center justify-center gap-2
          ${selectedFile && !isLoading
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.99]'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing Policy...
          </>
        ) : (
          <>
            <ShieldCheckIcon />
            Analyze Policy
          </>
        )}
      </button>
    </div>
  )
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export default FileUpload
