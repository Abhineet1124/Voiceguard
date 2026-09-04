import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:8000/api";

type DetectionResult = {
  success?: boolean;
  session_id?: string;
  chunk_number?: number;
  prediction?: string;
  confidence?: number;
  real_probability?: number;
  synthetic_probability?: number;
  risk_level?: string;
  risk_score?: number;
  action?: string;
  model_source?: string;
  model_version?: string;
  processing_time_ms?: number;
  cnn_available?: boolean;
  development_stage?: boolean;
  notice?: string;
  error?: string;
};

export default function RealtimePage() {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [processing, setProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const recordingStartedAtRef = useRef<number | null>(null);

  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<number | null>(null);

  const updateAudioLevel = () => {
    const analyser = analyserRef.current;

    if (!analyser) {
      return;
    }

    const data = new Uint8Array(
      analyser.frequencyBinCount
    );

    analyser.getByteTimeDomainData(data);

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      const normalized =
        (data[i] - 128) / 128;

      sum += normalized * normalized;
    }

    const rms = Math.sqrt(
      sum / data.length
    );

    setAudioLevel(
      Math.min(100, Math.round(rms * 250))
    );

    animationFrameRef.current =
      requestAnimationFrame(updateAudioLevel);
  };

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  };

  const sendChunkToBackend = async (
    blob: Blob
  ) => {
    if (!blob.size) {
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();

      formData.append(
        "file",
        blob,
        "realtime_chunk.webm"
      );

      const response = await fetch(
        `${API_URL}/analysis/realtime`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Realtime analysis failed."
        );
      }

      setResult(data);
      setError("");
    } catch (err) {
      console.error(
        "Realtime analysis error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Realtime analysis failed."
      );
    } finally {
      setProcessing(false);
    }
  };

  const sendCurrentChunks = async () => {
    if (!chunksRef.current.length) {
      return;
    }

    const currentChunks = [
      ...chunksRef.current,
    ];

    chunksRef.current = [];

    const blob = new Blob(
      currentChunks,
      {
        type: "audio/webm",
      }
    );

    await sendChunkToBackend(blob);
  };

  const startRecording = async () => {
    setError("");
    setResult(null);
    setElapsed(0);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      streamRef.current = stream;

      // ----------------------------------------------------
      // Audio monitoring
      // ----------------------------------------------------

      const audioContext =
        new AudioContext();

      const source =
        audioContext.createMediaStreamSource(
          stream
        );

      const analyser =
        audioContext.createAnalyser();

      analyser.fftSize = 256;

      source.connect(analyser);

      audioContextRef.current =
        audioContext;

      analyserRef.current =
        analyser;

      updateAudioLevel();

      // ----------------------------------------------------
      // MediaRecorder
      // ----------------------------------------------------

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
            {
              mimeType,
            }
          )
        : new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      chunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          chunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onerror = () => {
        setError(
          "Microphone recording encountered an error."
        );
      };

      recorder.onstop = async () => {
        await sendCurrentChunks();
      };

      recorder.start();

      recordingStartedAtRef.current =
        Date.now();

      setRecording(true);

      timerRef.current =
        window.setInterval(() => {
          if (
            recordingStartedAtRef.current
          ) {
            const seconds = Math.floor(
              (
                Date.now() -
                recordingStartedAtRef.current
              ) / 1000
            );

            setElapsed(seconds);
          }
        }, 1000);

      // ----------------------------------------------------
      // Development-stage chunk cycle
      // ----------------------------------------------------

      chunkTimerRef.current =
        window.setInterval(async () => {
          await sendCurrentChunks();
        }, 5000);
    } catch (err) {
      console.error(
        "Microphone error:",
        err
      );

      setError(
        "Microphone permission was denied or the microphone is unavailable."
      );

      stopRecording();
    }
  };

  const stopRecording = () => {
    if (
      chunkTimerRef.current !== null
    ) {
      window.clearInterval(
        chunkTimerRef.current
      );

      chunkTimerRef.current = null;
    }

    if (timerRef.current !== null) {
      window.clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }

    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    mediaRecorderRef.current =
      null;

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    stopAudioMonitoring();

    recordingStartedAtRef.current =
      null;

    setRecording(false);
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const formatTime = (
    seconds: number
  ) => {
    const minutes = Math.floor(
      seconds / 60
    );

    const remaining =
      seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remaining).padStart(
      2,
      "0"
    )}`;
  };

  const prediction =
    result?.prediction?.toLowerCase();

  const risk =
    result?.risk_level?.toLowerCase();

  const confidence =
    typeof result?.confidence === "number"
      ? Math.round(
          result.confidence * 100
        )
      : null;

  const riskScore =
    typeof result?.risk_score === "number"
      ? Math.round(
          result.risk_score * 100
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              recording
                ? "animate-pulse bg-red-500"
                : "bg-slate-500"
            }`}
          />

          <h1 className="text-2xl font-bold">
            Live Voice Detection
          </h1>
        </div>

        <p className="mt-1 text-sm text-slate-400">
          Real-time VoiceGuard microphone
          monitoring
        </p>
      </div>

      {/* Development Notice */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <p className="text-sm text-yellow-300">
          Development-stage streaming foundation.
          Detection results are not production-grade
          until the CNN is trained and evaluated on
          appropriate voice deepfake datasets.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Microphone Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Microphone
              </h2>

              <p className="text-sm text-slate-400">
                {recording
                  ? "Listening for voice activity"
                  : "Microphone is idle"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 px-3 py-2 font-mono text-lg">
              {formatTime(elapsed)}
            </div>
          </div>

          {/* Audio Level */}
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs text-slate-400">
              <span>
                Microphone Level
              </span>

              <span>
                {audioLevel}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${audioLevel}%`,
                }}
              />
            </div>
          </div>

          {/* Live Status */}
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950/60 p-5 text-center">
            <div
              className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 ${
                recording
                  ? "animate-pulse border-red-500"
                  : "border-slate-600"
              }`}
            >
              <span className="text-3xl">
                🎙️
              </span>
            </div>

            <p className="font-semibold">
              {recording
                ? "LIVE"
                : "READY"}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {processing
                ? "Analyzing audio..."
                : recording
                ? "VoiceGuard is monitoring"
                : "Start monitoring to begin"}
            </p>
          </div>

          {/* Controls */}
          {!recording ? (
            <button
              onClick={startRecording}
              className="w-full rounded-xl px-4 py-3 font-semibold transition hover:opacity-90"
            >
              Start Live Detection
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700"
            >
              Stop Live Detection
            </button>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Detection Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Detection Result
            </h2>

            <p className="text-sm text-slate-400">
              Latest VoiceGuard assessment
            </p>
          </div>

          {!result ? (
            <div className="flex min-h-[360px] items-center justify-center text-center">
              <div>
                <div className="mb-3 text-5xl">
                  🛡️
                </div>

                <p className="font-medium">
                  Waiting for audio
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Start live detection to receive
                  an analysis.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Prediction */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-5 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Classification
                </p>

                <p className="mt-2 text-3xl font-bold uppercase">
                  {prediction ||
                    "UNKNOWN"}
                </p>

                {confidence !== null && (
                  <p className="mt-2 text-sm text-slate-400">
                    Confidence:{" "}
                    {confidence}%
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Risk Level
                  </p>

                  <p className="mt-1 text-lg font-semibold uppercase">
                    {risk ||
                      "UNKNOWN"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Risk Score
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {riskScore !== null
                      ? `${riskScore}%`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Action
                  </p>

                  <p className="mt-1 text-lg font-semibold uppercase">
                    {result.action ||
                      "VERIFY"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Model
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {result.model_source ||
                      "baseline"}
                  </p>
                </div>
              </div>

              {/* Probabilities */}
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Probability Distribution
                </p>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>
                      Genuine
                    </span>

                    <span>
                      {Math.round(
                        (result.real_probability ||
                          0) * 100
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.round(
                          (result.real_probability ||
                            0) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>
                      Synthetic
                    </span>

                    <span>
                      {Math.round(
                        (result.synthetic_probability ||
                          0) * 100
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.round(
                          (result.synthetic_probability ||
                            0) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Info */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-400">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-600">
                      Session
                    </span>
                    <p className="mt-1 font-mono">
                      {result.session_id ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-600">
                      Chunk
                    </span>
                    <p className="mt-1">
                      {result.chunk_number ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-600">
                      Model Version
                    </span>
                    <p className="mt-1">
                      {result.model_version ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-600">
                      Processing
                    </span>
                    <p className="mt-1">
                      {result.processing_time_ms !==
                      undefined
                        ? `${result.processing_time_ms} ms`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Architecture */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Real-Time Security Pipeline
        </h2>

        <div className="grid gap-3 md:grid-cols-5">
          {[
            "Microphone",
            "Audio Chunk",
            "AI Detection",
            "Risk Engine",
            "Security Action",
          ].map((item, index) => (
            <div
              key={item}
              className="relative rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-center"
            >
              <p className="text-xs text-slate-500">
                STEP {index + 1}
              </p>

              <p className="mt-1 text-sm font-medium">
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}