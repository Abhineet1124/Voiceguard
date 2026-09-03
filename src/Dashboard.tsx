import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Server,
  BrainCircuit,
  Lock,
  RefreshCw,
} from "lucide-react"
import axios from "axios"

interface Analysis {
  id: string
  filename: string
  label: string
  confidence: number
  risk_level: string
  action: string
  processing_time: number
  model_version: string
  created_at?: string
}

interface AnalysisResponse {
  analyses: Analysis[]
  total: number
  limit: number
}

export default function Dashboard() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  const loadAnalyses = async () => {
    try {
      const response = await axios.get<AnalysisResponse>(
        "http://localhost:8000/api/analyses?limit=100"
      )

      setAnalyses(response.data.analyses || [])
    } catch (error) {
      console.error("Failed to load analyses:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyses()

    const interval = setInterval(loadAnalyses, 5000)

    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    return {
      total: analyses.length,
      genuine: analyses.filter((a) => a.label === "real").length,
      suspicious: analyses.filter((a) => a.label === "suspicious").length,
      highRisk: analyses.filter(
        (a) => a.risk_level === "high" || a.risk_level === "critical"
      ).length,
    }
  }, [analyses])

  const riskDistribution = useMemo(() => {
    return {
      low: analyses.filter((a) => a.risk_level === "low").length,
      medium: analyses.filter((a) => a.risk_level === "medium").length,
      high: analyses.filter((a) => a.risk_level === "high").length,
      critical: analyses.filter((a) => a.risk_level === "critical").length,
    }
  }, [analyses])

  const riskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400 bg-green-500/10 border-green-500/20"
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20"
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/20"
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20"
    }
  }

  const actionColor = (action: string) => {
    switch (action) {
      case "allow":
        return "text-green-400"
      case "verify":
        return "text-yellow-400"
      case "alert":
        return "text-orange-400"
      case "block":
        return "text-red-400"
      default:
        return "text-slate-400"
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Security Dashboard
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time voice security monitoring
          </p>
        </div>

        <button
          onClick={loadAnalyses}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-slate-800 border border-slate-700
                     hover:border-cyan-500 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Analyses</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <Activity className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Genuine Voices</p>
              <p className="text-3xl font-bold mt-2 text-green-400">
                {stats.genuine}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Suspicious</p>
              <p className="text-3xl font-bold mt-2 text-yellow-400">
                {stats.suspicious}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">High Risk</p>
              <p className="text-3xl font-bold mt-2 text-red-400">
                {stats.highRisk}
              </p>
            </div>
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
        </div>

      </div>

      {/* Middle section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Risk Distribution */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-5">
            Detection Distribution
          </h3>

          <div className="space-y-4">

            {[
              ["Low", riskDistribution.low, "bg-green-500"],
              ["Medium", riskDistribution.medium, "bg-yellow-500"],
              ["High", riskDistribution.high, "bg-orange-500"],
              ["Critical", riskDistribution.critical, "bg-red-500"],
            ].map(([label, value, color]) => {

              const count = Number(value)
              const percentage =
                stats.total > 0
                  ? (count / stats.total) * 100
                  : 0

              return (
                <div key={label as string}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-400">
                      {count}
                    </span>
                  </div>

                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}

          </div>
        </div>

        {/* Security Status */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-5">
            Security Status
          </h3>

          <div className="space-y-4">

            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-cyan-400" />
                <span>API Service</span>
              </div>
              <span className="text-green-400 text-sm font-medium">
                ● Operational
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-cyan-400" />
                <span>Detection Engine</span>
              </div>
              <span className="text-green-400 text-sm font-medium">
                ● Ready
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-cyan-400" />
                <span>Protection Layer</span>
              </div>
              <span className="text-green-400 text-sm font-medium">
                ● Active
              </span>
            </div>

          </div>

          <div className="mt-5 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-xs text-yellow-300">
              Detection engine currently uses a development-stage
              acoustic-feature baseline.
            </p>
          </div>
        </div>

      </div>

      {/* Recent Analyses */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-6 border-b border-slate-800">
          <h3 className="font-semibold text-lg">
            Recent Analyses
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading analysis history...
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-10 text-center">
            <Activity className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">
              No analyses yet
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Upload an audio file from Analyze Voice to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-slate-800/50">
                <tr className="text-left text-slate-400">
                  <th className="px-6 py-3">File</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Risk</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Confidence</th>
                </tr>
              </thead>

              <tbody>
                {analyses.slice(0, 10).map((analysis) => (
                  <tr
                    key={analysis.id}
                    className="border-t border-slate-800 hover:bg-slate-800/30"
                  >

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">
                        {analysis.filename}
                      </div>
                      <div className="text-xs text-slate-500">
                        {analysis.model_version}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {analysis.label === "real"
                        ? "GENUINE"
                        : analysis.label === "suspicious"
                        ? "SUSPICIOUS"
                        : "SYNTHETIC"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md border text-xs font-medium ${riskColor(
                          analysis.risk_level
                        )}`}
                      >
                        {analysis.risk_level.toUpperCase()}
                      </span>
                    </td>

                    <td
                      className={`px-6 py-4 font-medium uppercase ${actionColor(
                        analysis.action
                      )}`}
                    >
                      {analysis.action}
                    </td>

                    <td className="px-6 py-4 text-cyan-400">
                      {(analysis.confidence * 100).toFixed(1)}%
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </div>

    </div>
  )
}