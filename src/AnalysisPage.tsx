import React, { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:8000/api";

interface AnalysisData {
  id: string;
  filename: string;
  prediction: string;
  confidence: number;
  real_probability?: number;
  synthetic_probability?: number;
  model_version?: string;
  model_source?: string;
  risk_level?: string;
  risk_score?: number;
  action?: string;
  created_at?: string;
}

interface RiskData {
  risk_level?: string;
  action?: string;
  reason?: string;
}

interface SecurityData {
  model_source?: string;
  action?: string;
  risk_level?: string;
  incident_created?: boolean;
  database_saved?: boolean;
  event_id?: string;
}

interface IncidentData {
  event_id?: string;
  id?: string;
  file_hash?: string;
}

interface BaselineData {
  classification?: string;
  anomaly_score?: number;
  features?: Record<string, unknown>;
}

interface CNNData {
  available?: boolean;
  used?: boolean;
  prediction?: string | null;
  confidence?: number | null;
  model_version?: string | null;
}

interface AnalysisResponse {
  success: boolean;
  analysis: AnalysisData;
  risk?: RiskData;
  security?: SecurityData;
  baseline?: BaselineData;
  cnn?: CNNData;
  incident?: IncidentData | null;
  development_notice?: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
};

const formatPercent = (value?: number) => {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
};

const getRiskClass = (risk?: string) => {
  const value = risk?.toLowerCase();

  if (value === "critical") return "critical";
  if (value === "high") return "high";
  if (value === "medium") return "medium";

  return "low";
};

const getPredictionLabel = (prediction?: string) => {
  if (!prediction) return "Unknown";

  const value = prediction.toLowerCase();

  if (value === "synthetic") return "Synthetic / AI Generated";
  if (value === "suspicious") return "Suspicious";
  if (value === "real") return "Likely Genuine";

  return prediction;
};

export default function AnalysisPage() {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [audioLevel, setAudioLevel] =
    useState(0);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [result, setResult] =
    useState<AnalysisResponse | null>(null);

  const [error, setError] =
    useState("");

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const analyserRef =
    useRef<AnalyserNode | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const recordingTimerRef =
    useRef<number | null>(null);

  const recordedChunksRef =
    useRef<Blob[]>([]);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      stopAudioMonitoring();

      if (recordingTimerRef.current) {
        window.clearInterval(
          recordingTimerRef.current
        );
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // ==========================================================
  // AUDIO LEVEL MONITOR
  // ==========================================================

  const monitorAudioLevel = () => {
    const analyser = analyserRef.current;

    if (!analyser) return;

    const data =
      new Uint8Array(
        analyser.fftSize
      );

    analyser.getByteTimeDomainData(data);

    let sum = 0;

    for (const value of data) {
      const normalized =
        (value - 128) / 128;

      sum += normalized * normalized;
    }

    const rms =
      Math.sqrt(
        sum / data.length
      );

    const level = Math.min(
      100,
      Math.round(rms * 220)
    );

    setAudioLevel(level);

    animationFrameRef.current =
      requestAnimationFrame(
        monitorAudioLevel
      );
  };

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();

      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  };

  // ==========================================================
  // START RECORDING
  // ==========================================================

  const startRecording = async () => {
    try {
      setError("");
      setResult(null);
      setSelectedFile(null);

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setError(
          "Microphone access is not supported by this browser."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      mediaStreamRef.current = stream;

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        mimeType =
          "audio/webm;codecs=opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "audio/webm"
        )
      ) {
        mimeType = "audio/webm";
      }

      const recorder = mimeType
        ? new MediaRecorder(
            stream,
            { mimeType }
          )
        : new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      recordedChunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const blob =
          new Blob(
            recordedChunksRef.current,
            {
              type:
                mimeType ||
                "audio/webm",
            }
          );

        const file =
          new File(
            [blob],
            "voiceguard-recording.webm",
            {
              type:
                mimeType ||
                "audio/webm",
            }
          );

        setSelectedFile(file);

        if (
          mediaStreamRef.current
        ) {
          mediaStreamRef.current
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          mediaStreamRef.current =
            null;
        }
      };

      // Live audio monitoring.
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (AudioContextClass) {
        const context =
          new AudioContextClass();

        const source =
          context.createMediaStreamSource(
            stream
          );

        const analyser =
          context.createAnalyser();

        analyser.fftSize = 256;

        source.connect(analyser);

        audioContextRef.current =
          context;

        analyserRef.current =
          analyser;

        monitorAudioLevel();
      }

      recorder.start(250);

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current =
        window.setInterval(() => {
          setRecordingSeconds(
            (previous) =>
              previous + 1
          );
        }, 1000);

    } catch (err) {
      console.error(err);

      setError(
        "Microphone permission was denied or the microphone could not be accessed."
      );

      setIsRecording(false);
    }
  };

  // ==========================================================
  // STOP RECORDING
  // ==========================================================

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (recordingTimerRef.current) {
      window.clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current = null;
    }

    stopAudioMonitoring();
  };

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const allowed = [
      ".wav",
      ".mp3",
      ".m4a",
      ".ogg",
      ".webm",
    ];

    const filename =
      file.name.toLowerCase();

    const valid =
      allowed.some(
        (extension) =>
          filename.endsWith(extension)
      );

    if (!valid) {
      setError(
        "Unsupported audio format. Use WAV, MP3, M4A, OGG, or WebM."
      );

      setSelectedFile(null);

      return;
    }

    if (
      file.size >
      50 * 1024 * 1024
    ) {
      setError(
        "The audio file must be smaller than 50 MB."
      );

      setSelectedFile(null);

      return;
    }

    setError("");
    setResult(null);
    setSelectedFile(file);
  };

  // ==========================================================
  // ANALYZE
  // ==========================================================

  const analyzeVoice = async () => {
    if (!selectedFile) {
      setError(
        "Please record audio or select an audio file first."
      );

      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await fetch(
          `${API_URL}/analysis/analyze`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Voice analysis failed."
        );
      }

      if (!data?.success) {
        throw new Error(
          "VoiceGuard returned an invalid analysis response."
        );
      }

      setResult(data);

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the audio."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="analysis-page">

      <div className="analysis-header">
        <div>
          <h1>Voice Analysis</h1>

          <p>
            Detect. Verify. Prevent.
          </p>
        </div>

        <div className="analysis-status-badge">
          <span className="status-dot" />
          VoiceGuard Engine Online
        </div>
      </div>

      {/* =====================================================
          LIVE MICROPHONE
      ====================================================== */}

      <section className="analysis-card">

        <div className="analysis-card-header">
          <div>
            <h2>Live Voice Capture</h2>

            <p>
              Record speech for VoiceGuard analysis.
            </p>
          </div>

          {isRecording && (
            <span className="recording-badge">
              ● RECORDING
            </span>
          )}
        </div>

        <div className="recording-panel">

          <div className="recording-circle">

            <div
              className={
                isRecording
                  ? "mic-icon recording"
                  : "mic-icon"
              }
            >
              🎙️
            </div>

          </div>

          <div className="recording-info">

            <div className="recording-time">
              {formatTime(
                recordingSeconds
              )}
            </div>

            <div className="audio-level-label">
              Microphone Level
            </div>

            <div className="audio-level-bar">
              <div
                className="audio-level-fill"
                style={{
                  width: `${audioLevel}%`,
                }}
              />
            </div>

            <div className="audio-level-value">
              {audioLevel}%
            </div>

          </div>

        </div>

        <div className="analysis-actions">

          {!isRecording ? (
            <button
              className="primary-button"
              onClick={startRecording}
              disabled={isAnalyzing}
            >
              🎙 Start Recording
            </button>
          ) : (
            <button
              className="danger-button"
              onClick={stopRecording}
            >
              ■ Stop Recording
            </button>
          )}

        </div>

      </section>

      {/* =====================================================
          FILE UPLOAD
      ====================================================== */}

      <section className="analysis-card">

        <div className="analysis-card-header">
          <div>
            <h2>Audio File Analysis</h2>

            <p>
              Upload an existing recording.
            </p>
          </div>
        </div>

        <label
          className="upload-zone"
        >
          <input
            type="file"
            accept=".wav,.mp3,.m4a,.ogg,.webm,audio/*"
            onChange={
              handleFileChange
            }
            disabled={isAnalyzing}
          />

          <div className="upload-icon">
            ↑
          </div>

          <strong>
            Click to select audio
          </strong>

          <span>
            WAV, MP3, M4A, OGG, WebM ·
            Maximum 50 MB
          </span>
        </label>

        {selectedFile && (
          <div className="selected-file">

            <div>
              <strong>
                {selectedFile.name}
              </strong>

              <span>
                {" "}
                ·{" "}
                {(
                  selectedFile.size /
                  1024
                ).toFixed(1)}{" "}
                KB
              </span>
            </div>

            <button
              onClick={
                analyzeVoice
              }
              disabled={isAnalyzing}
              className="primary-button"
            >
              {isAnalyzing
                ? "Analyzing..."
                : "Analyze Voice"}
            </button>

          </div>
        )}

      </section>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="analysis-error">
          <strong>
            Analysis Error
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {/* =====================================================
          RESULT
      ====================================================== */}

      {result && (
        <section className="analysis-results">

          <div className="result-header">

            <div>
              <h2>
                Analysis Result
              </h2>

              <p>
                {result.analysis.filename}
              </p>
            </div>

            <div
              className={`risk-badge ${getRiskClass(
                result.analysis.risk_level
              )}`}
            >
              {(
                result.analysis.risk_level ||
                "unknown"
              ).toUpperCase()}
            </div>

          </div>

          {/* MAIN RESULT */}

          <div className="result-main">

            <div className="prediction-card">

              <span>
                CLASSIFICATION
              </span>

              <strong>
                {getPredictionLabel(
                  result.analysis.prediction
                )}
              </strong>

              <div className="confidence-value">
                {formatPercent(
                  result.analysis.confidence
                )}
              </div>

              <small>
                Confidence
              </small>

            </div>

            <div className="prediction-card">

              <span>
                RISK SCORE
              </span>

              <strong>
                {formatPercent(
                  result.analysis.risk_score
                )}
              </strong>

              <small>
                Security risk
              </small>

            </div>

            <div className="prediction-card">

              <span>
                SECURITY ACTION
              </span>

              <strong>
                {(
                  result.analysis.action ||
                  result.security?.action ||
                  "VERIFY"
                ).toUpperCase()}
              </strong>

              <small>
                Decision engine
              </small>

            </div>

          </div>

          {/* PROBABILITIES */}

          <div className="probability-grid">

            <div>
              <span>
                Likely Genuine
              </span>

              <strong>
                {formatPercent(
                  result.analysis
                    .real_probability
                )}
              </strong>
            </div>

            <div>
              <span>
                Likely Synthetic
              </span>

              <strong>
                {formatPercent(
                  result.analysis
                    .synthetic_probability
                )}
              </strong>
            </div>

          </div>

          {/* SECURITY */}

          <div className="security-result">

            <div>
              <span>
                Security Decision
              </span>

              <strong>
                {(
                  result.security?.action ||
                  result.risk?.action ||
                  "VERIFY"
                ).toUpperCase()}
              </strong>
            </div>

            <div>
              <span>
                Risk Level
              </span>

              <strong>
                {(
                  result.security?.risk_level ||
                  result.analysis.risk_level ||
                  "medium"
                ).toUpperCase()}
              </strong>
            </div>

            <div>
              <span>
                Event ID
              </span>

              <strong>
                {result.security?.event_id ||
                  result.incident?.event_id ||
                  result.incident?.id ||
                  "—"}
              </strong>
            </div>

          </div>

          {/* MODEL */}

          <div className="model-information">

            <div>
              <span>
                Detection Engine
              </span>

              <strong>
                {(
                  result.analysis.model_source ||
                  "baseline"
                ).toUpperCase()}
              </strong>
            </div>

            <div>
              <span>
                Model Version
              </span>

              <strong>
                {result.analysis
                  .model_version ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                CNN Status
              </span>

              <strong>
                {result.cnn?.used
                  ? "ACTIVE"
                  : "NOT TRAINED"}
              </strong>
            </div>

          </div>

          {/* DEVELOPMENT NOTICE */}

          <div className="analysis-baseline-notice">

            <strong>
              Development-stage model
            </strong>

            <p>
              {result.development_notice ||
                "VoiceGuard results are currently development-stage and must not be treated as production-grade voice-clone detection until the ML model is properly trained and evaluated."}
            </p>

          </div>

        </section>
      )}

    </div>
  );
}