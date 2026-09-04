import { useEffect, useRef, useState } from 'react'
import {
  Upload,
  Mic,
  Square,
  Play,
  Loader,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Fingerprint,
} from 'lucide-react'
import axios from 'axios'

interface SecurityDecision {
  action: string
  severity: string
  message: string
  decision_engine: string
}

interface Incident {
  incident_id: string
  audio_sha256: string
  created_at: string
}

interface AnalysisResult {
  id: string
  filename: string
  label: string
  confidence: number
  risk_level: string
  action: string
  processing_time: number
  model_version: string
  anomaly_score?: number
  security_decision?: SecurityDecision
  incident?: Incident
  disclaimer?: string
}

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }

      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, [recordedUrl])

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile)
      setResult(null)
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

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone recording is not supported by this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      audioChunksRef.current = []

      const recorder = new MediaRecorder(stream)

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        const recordedFile = new File(
          [audioBlob],
          'voiceguard-recording.webm',
          {
            type: audioBlob.type,
          }
        )

        const url = URL.createObjectURL(audioBlob)

        setRecordedUrl(url)
        setFile(recordedFile)

        stream.getTracks().forEach((track) => track.stop())

        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      recorder.start()

      setRecording(true)
      setRecordingTime(0)
      setResult(null)

      timerRef.current = window.setInterval(() => {
        setRecordingTime((previous) => previous + 1)
      }, 1000)
    } catch (error) {
      console.error('Microphone access failed:', error)
      alert(
        'Microphone access was denied or unavailable. Please allow microphone access in your browser.'
      )
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const analyzeAudio = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(
        'http://localhost:8000/api/analysis/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

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
      low: 'bg-green-900 text-green-200',
      medium: 'bg-yellow-900 text-yellow-200',
      high: 'bg-orange-900 text-orange-200',
      critical: 'bg-red-900 text-red-200',
    }

    return colors[risk] || 'bg-slate-800 text-slate-200'
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      allow: 'bg-green-900 text-green-200',
      verify: 'bg-yellow-900 text-yellow-200',
      alert: 'bg-orange-900 text-orange-200',
      block: 'bg-red-900 text-red-200',
    }

    return colors[action] || 'bg-slate-800 text-slate-200'
  }

  const getDecisionIcon = (action: string) => {
    if (action === 'block' || action === 'alert') {
      return <ShieldAlert className="w-6 h-6" />
    }

    if (action === 'verify') {
      return <AlertTriangle className="w-6 h-6" />
    }

    return <ShieldCheck className="w-6 h-6" />
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8">

      {/* Recording + Upload */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Microphone */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-cyan-500/10">
              <Mic className="w-6 h-6 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Record Voice
              </h2>

              <p className="text-sm text-slate-400">
                Analyze speech directly from your microphone
              </p>
            </div>
          </div>

          <div className="text-center py-8">

            <div
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 ${
                recording
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <Mic
                className={`w-10 h-10 ${
                  recording ? 'text-red-400' : 'text-slate-400'
                }`}
              />
            </div>

            {recording && (
              <div className="mt-5">
                <p className="text-red-400 font-semibold">
                  Recording...
                </p>

                <p className="text-2xl font-mono text-white mt-1">
                  {formatTime(recordingTime)}
                </p>
              </div>
            )}

            {!recording ? (
              <button
                onClick={startRecording}
                className="btn btn-primary mt-6"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="mt-6 inline-flex items-center justify-center px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </button>
            )}

          </div>

          {recordedUrl && (
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">

              <p className="text-sm text-slate-400 mb-3">
                Recorded Audio
              </p>

              <audio
                src={recordedUrl}
                controls
                className="w-full"
              />

            </div>
          )}

        </div>

        {/* Upload */}
        <div className="card">

          <div className="flex items-center gap-3 mb-6">

            <div className="p-3 rounded-lg bg-cyan-500/10">
              <Upload className="w-6 h-6 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Upload Audio
              </h2>

              <p className="text-sm text-slate-400">
                Analyze an existing audio recording
              </p>
            </div>

          </div>

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

            <Upload className="w-10 h-10 mx-auto mb-4 text-slate-400" />

            <p className="font-medium mb-2">
              Drag and drop audio file
            </p>

            <p className="text-sm text-slate-400 mb-4">
              or
            </p>

            <label className="btn btn-primary cursor-pointer">
              Choose File

              <input
                type="file"
                accept="audio/*"
                onChange={(e) =>
                  e.target.files &&
                  e.target.files[0] &&
                  handleFile(e.target.files[0])
                }
                className="hidden"
              />
            </label>

          </div>

          {file && (
            <div className="mt-5 p-4 bg-slate-800/50 rounded-lg">

              <p className="text-sm text-slate-400">
                Selected audio
              </p>

              <p className="font-medium mt-1 break-all">
                {file.name}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

            </div>
          )}

        </div>

      </div>

      {/* Analyze Button */}
      <div className="card">

        <button
          onClick={analyzeAudio}
          disabled={!file || loading || recording}
          className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Analyzing Voice...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Analyze Voice
            </>
          )}
        </button>

      </div>

      {/* Result */}
      {result && (
        <div className="card">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h2 className="text-xl font-bold">
                Voice Analysis Result
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Detection and security assessment
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${getRiskColor(
                result.risk_level
              )}`}
            >
              {result.risk_level.toUpperCase()} RISK
            </span>

          </div>

          {/* Main result */}
          <div className="grid md:grid-cols-4 gap-4">

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                Classification
              </p>

              <p
                className={`text-2xl font-bold mt-2 ${
                  result.label === 'real'
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {result.label === 'real'
                  ? 'GENUINE'
                  : result.label.toUpperCase()}
              </p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                Prototype Confidence
              </p>

              <p className="text-2xl font-bold text-cyan-400 mt-2">
                {(result.confidence * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                Anomaly Score
              </p>

              <p className="text-2xl font-bold text-white mt-2">
                {result.anomaly_score !== undefined
                  ? result.anomaly_score.toFixed(2)
                  : 'N/A'}
              </p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">
                Action
              </p>

              <span
                className={`inline-block mt-2 px-3 py-1 rounded-lg font-semibold text-sm ${getActionColor(
                  result.action
                )}`}
              >
                {result.action.toUpperCase()}
              </span>
            </div>

          </div>

          {/* Security decision */}
          {result.security_decision && (
            <div className="mt-6 p-5 rounded-xl border border-slate-700 bg-slate-950">

              <div className="flex items-start gap-4">

                <div
                  className={`p-3 rounded-lg ${getActionColor(
                    result.security_decision.action
                  )}`}
                >
                  {getDecisionIcon(result.security_decision.action)}
                </div>

                <div className="flex-1">

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-sm text-slate-400">
                        Security Decision
                      </p>

                      <p className="text-xl font-bold text-white mt-1">
                        {result.security_decision.action.toUpperCase()}
                      </p>
                    </div>

                    <span className="text-xs text-slate-500">
                      {result.security_decision.decision_engine}
                    </span>

                  </div>

                  <p className="text-sm text-slate-300 mt-3">
                    {result.security_decision.message}
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* Incident */}
          {result.incident && (
            <div className="mt-6 p-5 rounded-xl border border-cyan-900/50 bg-cyan-950/20">

              <div className="flex items-center gap-3 mb-4">

                <Fingerprint className="w-5 h-5 text-cyan-400" />

                <div>
                  <p className="font-semibold text-white">
                    Security Incident Logged
                  </p>

                  <p className="text-xs text-slate-400">
                    Integrity fingerprint generated
                  </p>
                </div>

              </div>

              <div className="space-y-3">

                <div>
                  <p className="text-xs text-slate-500">
                    Incident ID
                  </p>

                  <p className="font-mono text-sm text-cyan-300 mt-1">
                    {result.incident.incident_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    SHA-256
                  </p>

                  <p className="font-mono text-xs text-slate-400 mt-1 break-all">
                    {result.incident.audio_sha256}
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* Processing */}
          <div className="border-t border-slate-800 pt-5 mt-6">

            <p className="text-sm text-slate-400 mb-3">
              Processing Details
            </p>

            <div className="grid md:grid-cols-3 gap-3 text-sm">

              <div>
                <span className="text-slate-500">
                  Model:
                </span>

                <span className="ml-2 text-slate-200">
                  {result.model_version}
                </span>
              </div>

              <div>
                <span className="text-slate-500">
                  Processing:
                </span>

                <span className="ml-2 text-slate-200">
                  {result.processing_time.toFixed(2)}s
                </span>
              </div>

              <div>
                <span className="text-slate-500">
                  Analysis ID:
                </span>

                <span className="ml-2 font-mono text-slate-300 text-xs">
                  {result.id.slice(0, 12)}...
                </span>
              </div>

            </div>

          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 rounded-lg bg-yellow-950/20 border border-yellow-900/40">

            <p className="text-xs text-yellow-300">
              {result.disclaimer ||
                'Development-stage acoustic feature baseline. A trained anti-spoofing model is required for production deployment.'}
            </p>

          </div>

        </div>
      )}

    </div>
  )
}