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
  FileAudio,
  Activity,
  Clock3,
  Cpu,
  CheckCircle2,
  X,
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

  const clearFile = () => {
    setFile(null)
    setResult(null)

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
      setRecordedUrl(null)
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

        if (recordedUrl) {
          URL.revokeObjectURL(recordedUrl)
        }

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

  const getRiskClass = (risk: string) => {
    const normalized = risk.toLowerCase()

    if (normalized === 'low') {
      return 'analysis-risk-low'
    }

    if (normalized === 'medium') {
      return 'analysis-risk-medium'
    }

    if (normalized === 'high') {
      return 'analysis-risk-high'
    }

    if (normalized === 'critical') {
      return 'analysis-risk-critical'
    }

    return 'analysis-risk-default'
  }

  const getActionClass = (action: string) => {
    const normalized = action.toLowerCase()

    if (normalized === 'allow') {
      return 'analysis-action-allow'
    }

    if (normalized === 'verify') {
      return 'analysis-action-verify'
    }

    if (normalized === 'alert') {
      return 'analysis-action-alert'
    }

    if (normalized === 'block') {
      return 'analysis-action-block'
    }

    return 'analysis-action-default'
  }

  const getDecisionIcon = (action: string) => {
    const normalized = action.toLowerCase()

    if (normalized === 'block' || normalized === 'alert') {
      return <ShieldAlert className="w-6 h-6" />
    }

    if (normalized === 'verify') {
      return <AlertTriangle className="w-6 h-6" />
    }

    return <ShieldCheck className="w-6 h-6" />
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return (
      minutes.toString() +
      ':' +
      remainingSeconds.toString().padStart(2, '0')
    )
  }

  const confidencePercentage = result
    ? Math.max(0, Math.min(100, result.confidence * 100))
    : 0

  const anomalyPercentage = result?.anomaly_score !== undefined
    ? Math.max(0, Math.min(100, result.anomaly_score * 100))
    : 0

  return (
    <div className="analysis-page">

      {/* Page Header */}
      <div className="analysis-page-header">
        <div>
          <div className="analysis-eyebrow">
            <Activity className="w-4 h-4" />
            VOICE THREAT ANALYSIS
          </div>

          <h1 className="analysis-page-title">
            Analyze Voice
          </h1>

          <p className="analysis-page-subtitle">
            Inspect audio for potential synthetic or cloned voice characteristics.
          </p>
        </div>

        <div className="analysis-header-status">
          <span className="analysis-live-dot" />
          ANALYSIS ENGINE READY
        </div>
      </div>

      {/* Analysis Pipeline */}
      <div className="analysis-pipeline">
        <div className="analysis-pipeline-step active">
          <span>01</span>
          INPUT
        </div>

        <div className="analysis-pipeline-line" />

        <div className="analysis-pipeline-step">
          <span>02</span>
          FEATURES
        </div>

        <div className="analysis-pipeline-line" />

        <div className="analysis-pipeline-step">
          <span>03</span>
          DETECTION
        </div>

        <div className="analysis-pipeline-line" />

        <div className="analysis-pipeline-step">
          <span>04</span>
          DECISION
        </div>
      </div>

      {/* Input Cards */}
      <div className="analysis-input-grid">

        {/* Record Voice */}
        <section className="analysis-card">
          <div className="analysis-card-header">
            <div className="analysis-card-icon cyan">
              <Mic className="w-5 h-5" />
            </div>

            <div>
              <h2>Record Voice</h2>
              <p>Capture speech directly from your microphone</p>
            </div>

            <span className="analysis-card-number">01</span>
          </div>

          <div className="recording-zone">

            <div className={recording ? 'recording-orb recording' : 'recording-orb'}>
              <div className="recording-orb-inner">
                <Mic className="w-9 h-9" />
              </div>
            </div>

            {recording ? (
              <>
                <div className="recording-status">
                  <span className="recording-dot" />
                  RECORDING IN PROGRESS
                </div>

                <div className="recording-timer">
                  {formatTime(recordingTime)}
                </div>

                <p className="recording-helper">
                  Speak clearly into your microphone
                </p>

                <button
                  onClick={stopRecording}
                  className="analysis-record-button stop"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </button>
              </>
            ) : (
              <>
                <div className="recording-ready">
                  <CheckCircle2 className="w-4 h-4" />
                  MICROPHONE READY
                </div>

                <p className="recording-helper">
                  Record a voice sample for immediate analysis
                </p>

                <button
                  onClick={startRecording}
                  className="analysis-record-button"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </button>
              </>
            )}
          </div>

          {recordedUrl && (
            <div className="analysis-audio-preview">
              <div className="analysis-preview-label">
                <FileAudio className="w-4 h-4" />
                Recorded Sample
              </div>

              <audio
                src={recordedUrl}
                controls
                className="w-full"
              />
            </div>
          )}
        </section>

        {/* Upload Audio */}
        <section className="analysis-card">
          <div className="analysis-card-header">
            <div className="analysis-card-icon blue">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <h2>Upload Audio</h2>
              <p>Analyze an existing voice recording</p>
            </div>

            <span className="analysis-card-number">02</span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={
              dragActive
                ? 'analysis-dropzone active'
                : 'analysis-dropzone'
            }
          >
            <div className="analysis-upload-icon">
              <Upload className="w-7 h-7" />
            </div>

            <h3>
              {dragActive
                ? 'Release to upload'
                : 'Drop your audio file here'}
            </h3>

            <p>
              WAV, MP3, WebM and other browser-supported audio formats
            </p>

            <div className="analysis-or">
              <span />
              OR
              <span />
            </div>

            <label className="analysis-file-button">
              <FileAudio className="w-4 h-4" />
              Browse Files

              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0])
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {file && (
            <div className="analysis-file-card">
              <div className="analysis-file-icon">
                <FileAudio className="w-5 h-5" />
              </div>

              <div className="analysis-file-info">
                <span>SELECTED AUDIO</span>
                <strong>{file.name}</strong>
                <small>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </small>
              </div>

              <button
                onClick={clearFile}
                className="analysis-clear-button"
                title="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Analyze Control */}
      <section className="analysis-action-panel">
        <div className="analysis-action-info">
          <div className="analysis-action-icon">
            <Cpu className="w-5 h-5" />
          </div>

          <div>
            <strong>VoiceGuard Detection Engine</strong>
            <span>
              Submit an audio sample to begin the detection pipeline
            </span>
          </div>
        </div>

        <button
          onClick={analyzeAudio}
          disabled={!file || loading || recording}
          className="analysis-analyze-button"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              ANALYZING AUDIO
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              ANALYZE VOICE
            </>
          )}
        </button>
      </section>

      {/* Loading State */}
      {loading && (
        <section className="analysis-processing">
          <div className="analysis-processing-icon">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>

          <div className="analysis-processing-content">
            <strong>Processing audio sample...</strong>
            <span>
              Extracting acoustic characteristics and evaluating the current detection baseline.
            </span>

            <div className="analysis-processing-bar">
              <div className="analysis-processing-progress" />
            </div>
          </div>

          <span className="analysis-processing-label">
            RUNNING
          </span>
        </section>
      )}

      {/* Result */}
      {result && !loading && (
        <section className="analysis-result-card">

          {/* Result Header */}
          <div className="analysis-result-header">
            <div>
              <div className="analysis-eyebrow">
                <ShieldCheck className="w-4 h-4" />
                ANALYSIS COMPLETE
              </div>

              <h2>Voice Analysis Result</h2>

              <p>
                Security assessment generated for{' '}
                <strong>{result.filename}</strong>
              </p>
            </div>

            <div className={getRiskClass(result.risk_level)}>
              {result.risk_level.toUpperCase()} RISK
            </div>
          </div>

          {/* Classification Hero */}
          <div className="analysis-classification">

            <div className="analysis-classification-main">
              <span>VOICE CLASSIFICATION</span>

              <strong
                className={
                  result.label.toLowerCase() === 'real'
                    ? 'classification-real'
                    : 'classification-suspicious'
                }
              >
                {result.label.toLowerCase() === 'real'
                  ? 'GENUINE'
                  : result.label.toUpperCase()}
              </strong>

              <p>
                Current prototype assessment based on the configured detection model.
              </p>
            </div>

            <div className="analysis-confidence">
              <div className="confidence-ring">
                <div className="confidence-ring-inner">
                  <strong>
                    {confidencePercentage.toFixed(1)}%
                  </strong>
                  <span>CONFIDENCE</span>
                </div>
              </div>
            </div>

            <div className="analysis-result-metrics">
              <div>
                <span>ANOMALY SCORE</span>
                <strong>
                  {result.anomaly_score !== undefined
                    ? result.anomaly_score.toFixed(2)
                    : 'N/A'}
                </strong>
              </div>

              <div>
                <span>ACTION</span>
                <strong className={getActionClass(result.action)}>
                  {result.action.toUpperCase()}
                </strong>
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="analysis-meter-section">
            <div className="analysis-meter-header">
              <span>Detection Confidence</span>
              <strong>{confidencePercentage.toFixed(1)}%</strong>
            </div>

            <div className="analysis-meter">
              <div
                className="analysis-meter-fill"
                style={{
                  width: confidencePercentage + '%',
                }}
              />
            </div>
          </div>

          {/* Security Decision */}
          {result.security_decision && (
            <div className="analysis-security-decision">
              <div
                className={
                  'analysis-decision-icon ' +
                  getActionClass(result.security_decision.action)
                }
              >
                {getDecisionIcon(result.security_decision.action)}
              </div>

              <div className="analysis-decision-content">
                <div className="analysis-decision-heading">
                  <div>
                    <span>SECURITY DECISION</span>
                    <strong>
                      {result.security_decision.action.toUpperCase()}
                    </strong>
                  </div>

                  <div className="analysis-engine-label">
                    {result.security_decision.decision_engine}
                  </div>
                </div>

                <p>
                  {result.security_decision.message}
                </p>
              </div>
            </div>
          )}

          {/* Incident */}
          {result.incident && (
            <div className="analysis-incident">
              <div className="analysis-incident-header">
                <div className="analysis-incident-icon">
                  <Fingerprint className="w-5 h-5" />
                </div>

                <div>
                  <strong>Security Incident Logged</strong>
                  <span>
                    Integrity fingerprint generated for this analysis
                  </span>
                </div>
              </div>

              <div className="analysis-incident-grid">
                <div>
                  <span>INCIDENT ID</span>
                  <strong>
                    {result.incident.incident_id}
                  </strong>
                </div>

                <div>
                  <span>SHA-256 AUDIO FINGERPRINT</span>
                  <strong className="hash">
                    {result.incident.audio_sha256}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Processing Details */}
          <div className="analysis-details">
            <div className="analysis-details-title">
              <Clock3 className="w-4 h-4" />
              PROCESSING DETAILS
            </div>

            <div className="analysis-details-grid">
              <div>
                <span>MODEL VERSION</span>
                <strong>{result.model_version}</strong>
              </div>

              <div>
                <span>PROCESSING TIME</span>
                <strong>
                  {result.processing_time.toFixed(2)}s
                </strong>
              </div>

              <div>
                <span>ANALYSIS ID</span>
                <strong className="hash">
                  {result.id.slice(0, 16)}...
                </strong>
              </div>
            </div>
          </div>

          {/* Baseline Notice */}
          <div className="analysis-baseline-notice">
            <AlertTriangle className="w-5 h-5" />

            <div>
              <strong>Development-stage detection notice</strong>

              <p>
                {result.disclaimer ||
                  'This result is generated by the current acoustic-feature baseline. A trained anti-spoofing model is required for production deployment.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* No Result State */}
      {!result && !loading && (
        <div className="analysis-empty-state">
          <div className="analysis-empty-icon">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h3>Ready for voice analysis</h3>

          <p>
            Record a voice sample or upload an audio file to start the VoiceGuard detection pipeline.
          </p>
        </div>
      )}

      {/* Technical note */}
      <div className="analysis-footer-note">
        <ShieldAlert className="w-4 h-4" />
        <span>
          VoiceGuard is currently operating with a development-stage acoustic feature baseline. Results should be treated as prototype assessments.
        </span>
      </div>
    </div>
  )
}