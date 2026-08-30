import { useState } from 'react'
import { Upload, Play, Loader } from 'lucide-react'
import axios from 'axios'

interface AnalysisResult {
  id: string
  filename: string
  label: string
  confidence: number
  risk_level: string
  action: string
  processing_time: number
  model_version: string
}

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile)
    } else {
      alert('Please select an audio file')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const analyzeAudio = async () => {
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await axios.post('http://localhost:8000/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Analysis failed. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-900 text-green-200',
      'medium': 'bg-yellow-900 text-yellow-200',
      'high': 'bg-orange-900 text-orange-200',
      'critical': 'bg-red-900 text-red-200',
    }
    return colors[risk] || 'bg-slate-800 text-slate-200'
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'allow': 'bg-green-900 text-green-200',
      'verify': 'bg-yellow-900 text-yellow-200',
      'alert': 'bg-orange-900 text-orange-200',
      'block': 'bg-red-900 text-red-200',
    }
    return colors[action] || 'bg-slate-800 text-slate-200'
  }

  return (
    <div className="space-y-8">
      <div className="card max-w-2xl">
        <h2 className="text-xl font-bold mb-6">Upload Audio for Analysis</h2>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="font-medium mb-2">Drag and drop audio file here</p>
          <p className="text-sm text-slate-400 mb-4">or</p>
          <label className="btn btn-primary cursor-pointer">
            Choose File
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-400">Selected file:</p>
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <button
          onClick={analyzeAudio}
          disabled={!file || loading}
          className="btn btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            'Analyze Audio'
          )}
        </button>
      </div>

      {result && (
        <div className="card max-w-2xl">
          <h2 className="text-xl font-bold mb-6">Analysis Result</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Classification</p>
                <p className={`text-2xl font-bold ${result.label === 'real' ? 'text-green-400' : 'text-red-400'}`}>
                  {result.label === 'real' ? 'GENUINE' : 'SYNTHETIC'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Confidence Score</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Risk Level</p>
                <span className={`inline-block px-3 py-1 rounded-lg font-medium text-sm ${getRiskColor(result.risk_level)}`}>
                  {result.risk_level.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Recommended Action</p>
                <span className={`inline-block px-3 py-1 rounded-lg font-medium text-sm ${getActionColor(result.action)}`}>
                  {result.action.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <p className="text-sm text-slate-400">Processing Details</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-slate-500">Model:</span>
                  <span className="ml-2 text-slate-200">{result.model_version}</span>
                </div>
                <div>
                  <span className="text-slate-500">Processing Time:</span>
                  <span className="ml-2 text-slate-200">{result.processing_time.toFixed(2)}s</span>
                </div>
                <div>
                  <span className="text-slate-500">Analysis ID:</span>
                  <span className="ml-2 font-mono text-slate-300 text-xs">{result.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
