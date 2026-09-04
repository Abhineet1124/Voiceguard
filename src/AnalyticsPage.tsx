import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Database,
  Cpu,
} from "lucide-react";

interface Analysis {
  analysis_id: string;
  filename: string;
  classification: string;
  confidence: number;
  anomaly_score: number;
  risk_level: string;
  action: string;
  created_at: string;
}

export default function AnalyticsPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/analyses?limit=100"
      );

      setAnalyses(response.data.analyses || []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, 5000);

    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const total = analyses.length;

    const genuine = analyses.filter(
      (item) => item.classification.toLowerCase() === "real"
    ).length;

    const suspicious = analyses.filter(
      (item) =>
        item.classification.toLowerCase() === "fake" ||
        item.classification.toLowerCase() === "synthetic" ||
        item.classification.toLowerCase() === "cloned"
    ).length;

    const highRisk = analyses.filter(
      (item) =>
        item.risk_level.toLowerCase() === "high" ||
        item.risk_level.toLowerCase() === "critical"
    ).length;

    const averageConfidence =
      total > 0
        ? analyses.reduce(
            (sum, item) => sum + Number(item.confidence || 0),
            0
          ) / total
        : 0;

    const averageAnomaly =
      total > 0
        ? analyses.reduce(
            (sum, item) => sum + Number(item.anomaly_score || 0),
            0
          ) / total
        : 0;

    return {
      total,
      genuine,
      suspicious,
      highRisk,
      averageConfidence,
      averageAnomaly,
    };
  }, [analyses]);

  const riskCounts = useMemo(() => {
    return {
      low: analyses.filter(
        (item) => item.risk_level.toLowerCase() === "low"
      ).length,

      medium: analyses.filter(
        (item) => item.risk_level.toLowerCase() === "medium"
      ).length,

      high: analyses.filter(
        (item) => item.risk_level.toLowerCase() === "high"
      ).length,

      critical: analyses.filter(
        (item) => item.risk_level.toLowerCase() === "critical"
      ).length,
    };
  }, [analyses]);

  const classificationCounts = useMemo(() => {
    const result: Record<string, number> = {};

    analyses.forEach((item) => {
      const label = item.classification || "unknown";
      result[label] = (result[label] || 0) + 1;
    });

    return result;
  }, [analyses]);

  const actionCounts = useMemo(() => {
    const result: Record<string, number> = {};

    analyses.forEach((item) => {
      const action = item.action || "unknown";
      result[action] = (result[action] || 0) + 1;
    });

    return result;
  }, [analyses]);

  const getPercentage = (value: number) => {
    if (analyses.length === 0) {
      return 0;
    }

    return Math.round((value / analyses.length) * 100);
  };

  return (
    <div className="analytics-page">

      {/* HEADER */}
      <div className="analytics-header">

        <div>
          <div className="analytics-eyebrow">
            <BarChart3 size={14} />
            SECURITY ANALYTICS ENGINE
          </div>

          <h1 className="analytics-title">
            VoiceGuard Analytics
          </h1>

          <p className="analytics-subtitle">
            Detection performance, threat distribution, and security
            decision intelligence.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="analytics-refresh"
        >
          <RefreshCw
            size={16}
            className={loading ? "analytics-spin" : ""}
          />
          Refresh
        </button>

      </div>

      {/* LIVE STATUS */}
      <div className="analytics-status-strip">

        <div className="analytics-status-main">
          <span className="analytics-live-dot"></span>

          <div>
            <strong>ANALYTICS ENGINE ACTIVE</strong>

            <span>
              Processing live VoiceGuard analysis records
            </span>
          </div>
        </div>

        <div className="analytics-live">
          <span></span>
          LIVE DATA
        </div>

      </div>

      {/* KPI CARDS */}
      <div className="analytics-kpi-grid">

        <div className="analytics-kpi">

          <div className="analytics-kpi-icon">
            <Database size={20} />
          </div>

          <span>Total Analyses</span>

          <strong>
            {metrics.total}
          </strong>

          <small>
            Audio samples processed
          </small>

        </div>

        <div className="analytics-kpi cyan">

          <div className="analytics-kpi-icon">
            <ShieldCheck size={20} />
          </div>

          <span>Genuine</span>

          <strong>
            {metrics.genuine}
          </strong>

          <small>
            {getPercentage(metrics.genuine)}% of analyses
          </small>

        </div>

        <div className="analytics-kpi danger">

          <div className="analytics-kpi-icon">
            <ShieldAlert size={20} />
          </div>

          <span>Suspicious</span>

          <strong>
            {metrics.suspicious}
          </strong>

          <small>
            {getPercentage(metrics.suspicious)}% of analyses
          </small>

        </div>

        <div className="analytics-kpi warning">

          <div className="analytics-kpi-icon">
            <AlertTriangle size={20} />
          </div>

          <span>High Risk</span>

          <strong>
            {metrics.highRisk}
          </strong>

          <small>
            High + critical events
          </small>

        </div>

      </div>

      {/* PERFORMANCE ROW */}
      <div className="analytics-performance-grid">

        <div className="analytics-performance-card">

          <div className="analytics-card-heading">
            <div>
              <span>MODEL CONFIDENCE</span>
              <h3>Average Detection Confidence</h3>
            </div>

            <Cpu size={19} />
          </div>

          <div className="analytics-confidence-display">

            <div className="analytics-confidence-ring">
              <div>
                <strong>
                  {(metrics.averageConfidence * 100).toFixed(1)}%
                </strong>

                <span>CONFIDENCE</span>
              </div>
            </div>

            <div className="analytics-confidence-info">

              <p>
                Average confidence across all analyzed audio samples.
              </p>

              <div className="analytics-progress">
                <div
                  style={{
                    width:
                      metrics.averageConfidence * 100 + "%",
                  }}
                />
              </div>

            </div>

          </div>

        </div>

        <div className="analytics-performance-card">

          <div className="analytics-card-heading">
            <div>
              <span>ANOMALY DETECTION</span>
              <h3>Average Anomaly Score</h3>
            </div>

            <TrendingUp size={19} />
          </div>

          <div className="analytics-anomaly-value">
            {metrics.averageAnomaly.toFixed(3)}
          </div>

          <p className="analytics-description">
            Average acoustic anomaly score calculated by the current
            development-stage detection pipeline.
          </p>

          <div className="analytics-score-scale">
            <span>0.0</span>

            <div>
              <div
                style={{
                  width:
                    Math.min(
                      Math.max(metrics.averageAnomaly, 0),
                      1
                    ) *
                      100 +
                    "%",
                }}
              />
            </div>

            <span>1.0</span>
          </div>

        </div>

      </div>

      {/* DISTRIBUTION */}
      <div className="analytics-section-grid">

        {/* RISK */}
        <div className="analytics-panel">

          <div className="analytics-panel-header">
            <div>
              <span>THREAT ANALYSIS</span>
              <h3>Risk Distribution</h3>
            </div>

            <ShieldAlert size={18} />
          </div>

          <div className="analytics-bars">

            <div className="analytics-bar-row">

              <div className="analytics-bar-label">
                <span className="analytics-dot low"></span>
                Low
                <strong>{riskCounts.low}</strong>
              </div>

              <div className="analytics-bar">
                <div
                  className="low"
                  style={{
                    width:
                      getPercentage(riskCounts.low) + "%",
                  }}
                />
              </div>

              <span>
                {getPercentage(riskCounts.low)}%
              </span>

            </div>

            <div className="analytics-bar-row">

              <div className="analytics-bar-label">
                <span className="analytics-dot medium"></span>
                Medium
                <strong>{riskCounts.medium}</strong>
              </div>

              <div className="analytics-bar">
                <div
                  className="medium"
                  style={{
                    width:
                      getPercentage(riskCounts.medium) + "%",
                  }}
                />
              </div>

              <span>
                {getPercentage(riskCounts.medium)}%
              </span>

            </div>

            <div className="analytics-bar-row">

              <div className="analytics-bar-label">
                <span className="analytics-dot high"></span>
                High
                <strong>{riskCounts.high}</strong>
              </div>

              <div className="analytics-bar">
                <div
                  className="high"
                  style={{
                    width:
                      getPercentage(riskCounts.high) + "%",
                  }}
                />
              </div>

              <span>
                {getPercentage(riskCounts.high)}%
              </span>

            </div>

            <div className="analytics-bar-row">

              <div className="analytics-bar-label">
                <span className="analytics-dot critical"></span>
                Critical
                <strong>{riskCounts.critical}</strong>
              </div>

              <div className="analytics-bar">
                <div
                  className="critical"
                  style={{
                    width:
                      getPercentage(riskCounts.critical) + "%",
                  }}
                />
              </div>

              <span>
                {getPercentage(riskCounts.critical)}%
              </span>

            </div>

          </div>

        </div>

        {/* CLASSIFICATION */}
        <div className="analytics-panel">

          <div className="analytics-panel-header">
            <div>
              <span>VOICE CLASSIFICATION</span>
              <h3>Detection Labels</h3>
            </div>

            <Activity size={18} />
          </div>

          {Object.keys(classificationCounts).length === 0 ? (

            <div className="analytics-no-data">
              No classification data available.
            </div>

          ) : (

            <div className="analytics-classification-list">

              {Object.entries(classificationCounts).map(
                ([label, count]) => (

                  <div
                    key={label}
                    className="analytics-classification-item"
                  >

                    <div>
                      <span>{label}</span>

                      <strong>
                        {count}
                      </strong>
                    </div>

                    <div className="analytics-mini-bar">
                      <div
                        style={{
                          width:
                            getPercentage(count) + "%",
                        }}
                      />
                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

      {/* SECURITY ACTIONS */}
      <div className="analytics-panel analytics-actions-panel">

        <div className="analytics-panel-header">

          <div>
            <span>DECISION ENGINE</span>
            <h3>Security Actions</h3>
          </div>

          <ShieldCheck size={18} />

        </div>

        <div className="analytics-actions-grid">

          {Object.keys(actionCounts).length === 0 ? (

            <div className="analytics-no-data">
              No security action data available.
            </div>

          ) : (

            Object.entries(actionCounts).map(
              ([action, count]) => (

                <div
                  key={action}
                  className="analytics-action-card"
                >

                  <div className="analytics-action-icon">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <span>
                      {action}
                    </span>

                    <strong>
                      {count}
                    </strong>

                    <small>
                      {getPercentage(count)}% of decisions
                    </small>
                  </div>

                </div>

              )
            )

          )}

        </div>

      </div>

      {/* EMPTY / LOADING */}
      {loading && analyses.length === 0 ? (

        <div className="analytics-loading">
          <RefreshCw className="analytics-spin" size={28} />

          <h3>Loading analytics</h3>

          <p>
            Connecting to the VoiceGuard analysis engine...
          </p>
        </div>

      ) : null}

      {/* DISCLAIMER */}
      <div className="analytics-disclaimer">

        <ShieldCheck size={16} />

        <p>
          Analytics are based on the currently available
          development-stage detection pipeline. Metrics should
          not be interpreted as production-grade model validation.
        </p>

      </div>

    </div>
  );
}