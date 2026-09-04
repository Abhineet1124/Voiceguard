import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Fingerprint,
  RefreshCw,
} from "lucide-react";

interface Incident {
  incident_id: string;
  analysis_id: string;
  incident_type: string;
  filename: string;
  risk_level: string;
  action: string;
  confidence: number;
  anomaly_score: number;
  audio_sha256: string;
  created_at: string;
  status: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/incidents?limit=100"
      );

      setIncidents(response.data.incidents || []);
    } catch (error) {
      console.error("Failed to load incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    const interval = setInterval(fetchIncidents, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRiskClass = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "block":
      case "alert":
        return <ShieldAlert className="w-4 h-4" />;
      case "verify":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <ShieldCheck className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Security Incidents
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Voice analysis events and security decisions
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-slate-800 border border-slate-700
                     hover:border-cyan-500 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">Total Events</p>
          <p className="text-3xl font-bold text-white mt-2">
            {incidents.length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">High / Critical</p>
          <p className="text-3xl font-bold text-red-400 mt-2">
            {
              incidents.filter(
                (i) =>
                  i.risk_level === "high" ||
                  i.risk_level === "critical"
              ).length
            }
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">Protection Actions</p>
          <p className="text-3xl font-bold text-cyan-400 mt-2">
            {
              incidents.filter(
                (i) =>
                  i.action === "alert" ||
                  i.action === "block" ||
                  i.action === "verify"
              ).length
            }
          </p>
        </div>

      </div>

      {/* Incidents */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">
            Incident Log
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading security incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">

            <ShieldCheck className="w-12 h-12 mx-auto text-green-500 mb-4" />

            <p className="text-white font-medium">
              No security incidents
            </p>

            <p className="text-sm text-slate-400 mt-1">
              Analyze an audio file to generate a security event.
            </p>

          </div>
        ) : (

          <div className="divide-y divide-slate-800">

            {incidents.map((incident) => (

              <div
                key={incident.incident_id}
                className="p-6 hover:bg-slate-800/40 transition-colors"
              >

                <div className="flex items-start justify-between gap-6">

                  {/* Left */}
                  <div className="flex items-start gap-4">

                    <div className="p-3 rounded-lg bg-slate-800">
                      {getActionIcon(incident.action)}
                    </div>

                    <div>

                      <div className="flex items-center gap-3">

                        <h4 className="font-semibold text-white">
                          {incident.incident_id}
                        </h4>

                        <span
                          className={`px-2 py-1 text-xs rounded-full border uppercase ${getRiskClass(
                            incident.risk_level
                          )}`}
                        >
                          {incident.risk_level}
                        </span>

                      </div>

                      <p className="text-sm text-slate-400 mt-1">
                        {incident.incident_type}
                      </p>

                      <p className="text-sm text-slate-300 mt-3">
                        Audio:{" "}
                        <span className="text-slate-400">
                          {incident.filename}
                        </span>
                      </p>

                    </div>

                  </div>

                  {/* Action */}
                  <div className="text-right">

                    <p className="text-xs text-slate-500 uppercase">
                      Security Action
                    </p>

                    <p className="text-lg font-bold text-cyan-400 uppercase mt-1">
                      {incident.action}
                    </p>

                  </div>

                </div>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">

                  <div>
                    <p className="text-xs text-slate-500">
                      Confidence
                    </p>

                    <p className="text-sm text-white mt-1">
                      {(incident.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Anomaly Score
                    </p>

                    <p className="text-sm text-white mt-1">
                      {incident.anomaly_score}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Status
                    </p>

                    <p className="text-sm text-white mt-1 uppercase">
                      {incident.status}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created
                    </p>

                    <p className="text-sm text-white mt-1">
                      {new Date(
                        incident.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                </div>

                {/* Hash */}
                <div className="mt-5 p-3 bg-slate-950 rounded-lg border border-slate-800">

                  <p className="text-xs text-slate-500 flex items-center gap-2 mb-1">
                    <Fingerprint className="w-3 h-3" />
                    SHA-256 Audio Fingerprint
                  </p>

                  <p className="text-xs text-slate-400 break-all font-mono">
                    {incident.audio_sha256}
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* Prototype disclaimer */}
      <div className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-900/50">

        <p className="text-xs text-cyan-300">
          Development-stage incident monitoring. SHA-256 provides an
          integrity fingerprint for the analyzed audio; it does not by
          itself prove that a voice recording is authentic.
        </p>

      </div>

    </div>
  );
}