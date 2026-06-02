import React, { useRef, useState, useCallback } from 'react'
import {
  Upload,
  FileText,
  FileType2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react'

interface FileUploadProps {
  onAnalyze: (file: File) => Promise<void>
  isLoading: boolean
  error: string | null
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const STATUS_MESSAGES = [
  'Extracting document text…',
  'Parsing policy structure…',
  'Generating summary…',
]

const PP_EXAMPLES = [
  'Infection Control & Prevention',
  'Medication Administration',
  'Patient Consent Procedures',
  'HIPAA Privacy & Security',
  'Emergency Response Plans',
  'Hand Hygiene Protocols',
  'Fall Prevention Programs',
  'Discharge Planning',
]

const FILE_TYPE_INFO = [
  { ext: 'PDF', icon: <FileType2 className="w-4 h-4 text-red-500" />, label: 'Adobe PDF' },
  { ext: 'DOCX', icon: <FileText className="w-4 h-4 text-blue-500" />, label: 'Word Document' },
  { ext: 'TXT', icon: <FileText className="w-4 h-4 text-slate-500" />, label: 'Plain Text' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAccepted(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME.includes(file.type)
}

const FileUpload: React.FC<FileUploadProps> = ({ onAnalyze, isLoading, error }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [typeError, setTypeError] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const statusInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFile = (file: File) => {
    if (!isAccepted(file)) {
      setTypeError(true)
      setSelectedFile(null)
      return
    }
    setTypeError(false)
    setSelectedFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    setTypeError(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleAnalyze = async () => {
    if (!selectedFile || isLoading) return
    if (statusInterval.current) clearInterval(statusInterval.current)
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
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Card header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex-shrink-0">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Upload Policy &amp; Procedure Document
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload your hospital's policy or procedure document to begin the compliance analysis.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isLoading && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
            ${dragging
              ? 'border-blue-500 bg-blue-50'
              : selectedFile
                ? 'border-green-400 bg-green-50/60'
                : typeError
                  ? 'border-red-300 bg-red-50/40'
                  : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
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
            /* File selected state */
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex-shrink-0 bg-white border border-slate-200 rounded-lg p-3">
                {selectedFile.name.endsWith('.pdf')
                  ? <FileType2 className="w-7 h-7 text-red-500" />
                  : selectedFile.name.endsWith('.docx')
                    ? <FileText className="w-7 h-7 text-blue-500" />
                    : <FileText className="w-7 h-7 text-slate-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="font-medium text-slate-800 text-sm truncate">{selectedFile.name}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatBytes(selectedFile.size)} · {selectedFile.name.split('.').pop()?.toUpperCase()} · Ready to analyze
                </p>
                <p className="text-xs text-blue-600 mt-1.5">Click anywhere to replace this file</p>
              </div>
              <button
                onClick={clearFile}
                className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Empty / drag state */
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className={`rounded-full p-4 mb-4 transition-colors ${dragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <Upload className={`w-8 h-8 transition-colors ${dragging ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <p className="font-semibold text-slate-700">
                {dragging ? 'Drop your document here' : 'Drag & drop your P&P document here'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                or{' '}
                <span className="text-blue-600 font-medium hover:underline">click to browse files</span>
              </p>

              {/* Accepted formats */}
              <div className="flex items-center gap-3 mt-5">
                {FILE_TYPE_INFO.map(({ ext, icon, label }) => (
                  <div key={ext} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-1.5">
                    {icon}
                    <span className="text-xs font-medium text-slate-600">{ext}</span>
                    <span className="text-xs text-slate-400 hidden sm:inline">· {label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2.5">Maximum file size: 20 MB</p>
            </div>
          )}
        </div>

        {/* Invalid file type error */}
        {typeError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Unsupported file type</p>
              <p className="text-xs text-red-600 mt-0.5">Please upload a PDF, DOCX, or TXT file.</p>
            </div>
          </div>
        )}

        {/* API / analysis error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Analysis failed</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading status */}
        {isLoading && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3.5 animate-fade-in">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Extracting &amp; summarizing…</p>
              <p className="text-xs text-blue-600 mt-0.5">{STATUS_MESSAGES[statusIdx]}</p>
            </div>
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isLoading}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200
            flex items-center justify-center gap-2
            ${selectedFile && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <ShieldCheckIcon />
              Analyze Document
            </>
          )}
        </button>

        {/* What you can upload */}
        <div className="border border-slate-100 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Supported Document Types
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PP_EXAMPLES.map(example => (
              <div key={example} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                {example}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Upload any written policy, procedure, protocol, or guideline from your hospital's
            compliance or quality management system.
          </p>
        </div>
      </div>
    </div>
  )
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export default FileUpload
