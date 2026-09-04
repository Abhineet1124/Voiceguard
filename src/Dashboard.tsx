import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";

type Analysis = {
  id?: string;
  filename?: string;
  label?: string;
  confidence?: number;
  risk_level?: string;
  risk?: string;
  action?: string;
  created_at?: string;
  timestamp?: string;
};

const API_URL = "http://localhost:8000";

export default function Dashboard() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        API_URL + "/api/analyses?limit=100"
      );

      const data = response.data;

      if (Array.isArray(data)) {
        setAnalyses(data);
      } else if (Array.isArray(data?.analyses)) {
        setAnalyses(data.analyses);
      } else if (Array.isArray(data?.items)) {
        setAnalyses(data.items);
      } else {
        setAnalyses([]);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch analyses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();

    const interval = setInterval(() => {
      fetchAnalyses();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = analyses.length;

    const genuine = analyses.filter(
      (item) =>
        String(item.label || "").toLowerCase() === "real" ||
        String(item.label || "").toLowerCase() === "genuine"
    ).length;

    const suspicious = analyses.filter((item) => {
      const label = String(item.label || "").toLowerCase();
      return label === "fake" || label === "synthetic" || label === "suspicious";
    }).length;

    const highRisk = analyses.filter((item) => {
      const risk = String(
        item.risk_level || item.risk || ""
      ).toLowerCase();

      return risk === "high" || risk === "critical";
    }).length;

    return {
      total,
      genuine,
      suspicious,
      highRisk,
    };
  }, [analyses]);

  const riskDistribution = useMemo(() => {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    analyses.forEach((item) => {
      const risk = String(
        item.risk_level || item.risk || "low"
      ).toLowerCase();

      if (risk === "critical") {
        distribution.critical++;
      } else if (risk === "high") {
        distribution.high++;
      } else if (risk === "medium") {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    });

    return distribution;
  }, [analyses]);

  const getRiskClass = (risk: string) => {
    const value = risk.toLowerCase();

    if (value === "critical") {
      return "risk-critical";
    }

    if (value === "high") {
      return "risk-high";
    }

    if (value === "medium") {
      return "risk-medium";
    }

    return "risk-low";
  };

  const getActionClass = (action: string) => {
    const value = action.toLowerCase();

    if (
      value.includes("block") ||
      value.includes("alert") ||
      value.includes("reject")
    ) {
      return "action-danger";
    }

    if (
      value.includes("verify") ||
      value.includes("review")
    ) {
      return "action-warning";
    }

    return "action-safe";
  };

  const total = stats.total || 1;

  const genuinePercentage = Math.round(
    (stats.genuine / total) * 100
  );

  const suspiciousPercentage = Math.round(
    (stats.suspicious / total) * 100
  );

  const riskPercentage = Math.round(
    (stats.highRisk / total) * 100
  );

  const riskItems = [
    {
      label: "Low Risk",
      value: riskDistribution.low,
      className: "risk-low",
    },
    {
      label: "Medium Risk",
      value: riskDistribution.medium,
      className: "risk-medium",
    },
    {
      label: "High Risk",
      value: riskDistribution.high,
      className: "risk-high",
    },
    {
      label: "Critical",
      value: riskDistribution.critical,
      className: "risk-critical",
    },
  ];

  return (
    <div className="dashboard-shell">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <div className="dashboard-eyebrow">
            <span className="status-dot" />
            VOICE SECURITY CENTER
          </div>

          <h1 className="dashboard-title">
            VoiceGuard Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Detect. Verify. Prevent.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <div className="system-status">
            <span className="status-dot" />
            <span>System Operational</span>
          </div>

          <button
            className="btn btn-secondary refresh-button"
            onClick={fetchAnalyses}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-content">

        {/* Statistics */}
        <section className="stats-grid">

          <div className="dashboard-stat-card">
            <div className="stat-card-top">
              <div className="dashboard-icon cyan">
                <Activity size={20} />
              </div>

              <span className="stat-status">
                LIVE
              </span>
            </div>

            <p className="dashboard-label">
              Total Analyses
            </p>

            <div className="dashboard-number">
              {stats.total}
            </div>

            <p className="stat-description">
              Voice samples analyzed
            </p>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-card-top">
              <div className="dashboard-icon green">
                <CheckCircle size={20} />
              </div>

              <span className="stat-status success">
                SAFE
              </span>
            </div>

            <p className="dashboard-label">
              Genuine Voices
            </p>

            <div className="dashboard-number">
              {stats.genuine}
            </div>

            <p className="stat-description">
              Verified authentic samples
            </p>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-card-top">
              <div className="dashboard-icon amber">
                <AlertTriangle size={20} />
              </div>

              <span className="stat-status warning">
                REVIEW
              </span>
            </div>

            <p className="dashboard-label">
              Suspicious
            </p>

            <div className="dashboard-number">
              {stats.suspicious}
            </div>

            <p className="stat-description">
              Potential synthetic voices
            </p>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-card-top">
              <div className="dashboard-icon red">
                <ShieldAlert size={20} />
              </div>

              <span className="stat-status danger">
                HIGH RISK
              </span>
            </div>

            <p className="dashboard-label">
              High Risk
            </p>

            <div className="dashboard-number">
              {stats.highRisk}
            </div>

            <p className="stat-description">
              Require security action
            </p>
          </div>

        </section>

        {/* Analytics */}
        <section className="analytics-grid">

          {/* Detection Distribution */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-eyebrow">
                  ANALYTICS
                </p>

                <h2>
                  Detection Distribution
                </h2>
              </div>

              <BrainCircuit size={22} />
            </div>

            <div className="distribution-container">

              <div className="distribution-row">
                <div className="distribution-label">
                  <span>Genuine</span>
                  <strong>{genuinePercentage}%</strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill progress-green"
                    style={{
                      width: genuinePercentage + "%",
                    }}
                  />
                </div>
              </div>

              <div className="distribution-row">
                <div className="distribution-label">
                  <span>Suspicious</span>
                  <strong>{suspiciousPercentage}%</strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill progress-amber"
                    style={{
                      width: suspiciousPercentage + "%",
                    }}
                  />
                </div>
              </div>

              <div className="distribution-row">
                <div className="distribution-label">
                  <span>High Risk</span>
                  <strong>{riskPercentage}%</strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill progress-red"
                    style={{
                      width: riskPercentage + "%",
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Risk Distribution */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="dashboard-eyebrow">
                  RISK ENGINE
                </p>

                <h2>
                  Risk Distribution
                </h2>
              </div>

              <ShieldAlert size={22} />
            </div>

            <div className="risk-list">

              {riskItems.map((item) => {
                const percentage =
                  stats.total > 0
                    ? Math.round(
                        (item.value / stats.total) * 100
                      )
                    : 0;

                return (
                  <div
                    className="risk-item"
                    key={item.label}
                  >
                    <div className="risk-item-header">

                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "h-2 w-2 rounded-full " +
                            item.className
                          }
                        />

                        <span className="risk-item-label">
                          {item.label}
                        </span>
                      </div>

                      <div className="risk-item-value">
                        {item.value}
                      </div>
                    </div>

                    <div className="progress-track">
                      <div
                        className={
                          "progress-fill " +
                          item.className
                        }
                        style={{
                          width: percentage + "%",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

        </section>

        {/* Security Status */}
        <section className="dashboard-panel security-panel">

          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-eyebrow">
                SECURITY
              </p>

              <h2>
                Security Status
              </h2>
            </div>

            <Lock size={22} />
          </div>

          <div className="security-grid">

            <div className="security-item">
              <div className="security-item-icon">
                <Server size={18} />
              </div>

              <div>
                <span>API Server</span>
                <strong>Operational</strong>
              </div>

              <span className="security-indicator" />
            </div>

            <div className="security-item">
              <div className="security-item-icon">
                <BrainCircuit size={18} />
              </div>

              <div>
                <span>Detection Engine</span>
                <strong>Baseline Active</strong>
              </div>

              <span className="security-indicator" />
            </div>

            <div className="security-item">
              <div className="security-item-icon">
                <Lock size={18} />
              </div>

              <div>
                <span>Secure Logging</span>
                <strong>Enabled</strong>
              </div>

              <span className="security-indicator" />
            </div>

          </div>

        </section>

        {/* Development notice */}
        <section className="development-notice">

          <div className="notice-icon">
            <BrainCircuit size={20} />
          </div>

          <div>
            <h3>
              Development-Stage Detection Model
            </h3>

            <p>
              VoiceGuard is currently using a baseline
              acoustic-feature detection pipeline. ML
              performance will improve as the trained
              voice-clone detection model and evaluation
              datasets are integrated.
            </p>
          </div>

        </section>

        {/* Recent Analyses */}
        <section className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-eyebrow">
                ACTIVITY
              </p>

              <h2>
                Recent Analyses
              </h2>
            </div>

            <span className="analysis-count">
              {analyses.length} records
            </span>
          </div>

          {analyses.length === 0 ? (
            <div className="empty-state">

              <Activity size={32} />

              <h3>
                No analyses yet
              </h3>

              <p>
                Upload a voice sample to begin detection.
              </p>

            </div>
          ) : (
            <div className="table-wrapper">

              <table className="analysis-table">

                <thead>
                  <tr>
                    <th>File</th>
                    <th>Detection</th>
                    <th>Confidence</th>
                    <th>Risk</th>
                    <th>Action</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>

                  {analyses.slice(0, 10).map((item, index) => {

                    const label =
                      item.label || "Unknown";

                    const risk =
                      item.risk_level ||
                      item.risk ||
                      "Low";

                    const action =
                      item.action ||
                      "Monitor";

                    const confidence =
                      typeof item.confidence === "number"
                        ? Math.round(item.confidence * 100)
                        : 0;

                    const dateValue =
                      item.created_at ||
                      item.timestamp;

                    let time = "—";

                    if (dateValue) {
                      try {
                        time = new Date(
                          dateValue
                        ).toLocaleString();
                      } catch {
                        time = String(dateValue);
                      }
                    }

                    return (
                      <tr
                        key={
                          item.id ||
                          item.filename ||
                          index
                        }
                      >

                        <td>
                          <div className="file-cell">
                            <Activity size={16} />

                            <span>
                              {item.filename ||
                                "Audio Sample"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              String(label)
                                .toLowerCase()
                                .includes("real") ||
                              String(label)
                                .toLowerCase()
                                .includes("genuine")
                                ? "badge badge-safe"
                                : "badge badge-warning"
                            }
                          >
                            {label}
                          </span>
                        </td>

                        <td>
                          <span className="confidence-value">
                            {confidence}%
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              "badge " +
                              getRiskClass(String(risk))
                            }
                          >
                            {risk}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              "badge " +
                              getActionClass(String(action))
                            }
                          >
                            {action}
                          </span>
                        </td>

                        <td className="time-cell">
                          {time}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="dashboard-footer">

        <div>
          <strong>VOICEGUARD</strong>
          <span>
            AI-Powered Voice Clone Detection
          </span>
        </div>

        <div>
          {lastUpdated
            ? "Last updated " +
              lastUpdated.toLocaleTimeString()
            : "Waiting for system data"}
        </div>

      </footer>

    </div>
  );
}