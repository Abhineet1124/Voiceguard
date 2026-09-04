import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Fingerprint,
  RefreshCw,
  Activity,
  Ban,
  CheckCircle2,
  Search,
  ChevronDown,
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
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

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

  const summary = useMemo(() => {
    const highCritical = incidents.filter(
      (incident) =>
        incident.risk_level.toLowerCase() === "high" ||
        incident.risk_level.toLowerCase() === "critical"
    ).length;

    const protectionActions = incidents.filter(
      (incident) =>
        incident.action.toLowerCase() === "alert" ||
        incident.action.toLowerCase() === "block" ||
        incident.action.toLowerCase() === "verify"
    ).length;

    const blocked = incidents.filter(
      (incident) => incident.action.toLowerCase() === "block"
    ).length;

    return {
      total: incidents.length,
      highCritical,
      protectionActions,
      blocked,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch =
        incident.incident_id
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        incident.filename
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        incident.incident_type
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesRisk =
        riskFilter === "all" ||
        incident.risk_level.toLowerCase() === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [incidents, search, riskFilter]);

  const getRiskClass = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "critical":
        return "incident-risk-critical";

      case "high":
        return "incident-risk-high";

      case "medium":
        return "incident-risk-medium";

      default:
        return "incident-risk-low";
    }
  };

  const getActionClass = (action: string) => {
    switch (action.toLowerCase()) {
      case "block":
        return "incident-action-block";

      case "alert":
        return "incident-action-alert";

      case "verify":
        return "incident-action-verify";

      default:
        return "incident-action-allow";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "block":
        return <Ban size={16} />;

      case "alert":
        return <ShieldAlert size={16} />;

      case "verify":
        return <AlertTriangle size={16} />;

      default:
        return <ShieldCheck size={16} />;
    }
  };

  return (
    <div className="incidents-page">

      {/* PAGE HEADER */}
      <div className="incidents-header">

        <div>
          <div className="incidents-eyebrow">
            <Activity size={14} />
            SECURITY EVENT MONITOR
          </div>

          <h1 className="incidents-title">
            Security Incidents
          </h1>

          <p className="incidents-subtitle">
            Monitor voice-analysis events, threat classifications,
            and automated security decisions.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          className="incidents-refresh"
        >
          <RefreshCw
            size={16}
            className={loading ? "incident-spin" : ""}
          />
          Refresh
        </button>

      </div>

      {/* SECURITY STATUS STRIP */}
      <div className="incident-status-strip">

        <div className="incident-status-left">
          <span className="incident-status-dot"></span>

          <div>
            <strong>INCIDENT MONITORING ACTIVE</strong>
            <span>
              Live security event synchronization enabled
            </span>
          </div>
        </div>

        <div className="incident-live">
          <span></span>
          LIVE
        </div>

      </div>

      {/* SUMMARY CARDS */}
      <div className="incident-summary-grid">

        <div className="incident-stat-card">
          <div className="incident-stat-icon neutral">
            <Activity size={20} />
          </div>

          <div>
            <span>Total Events</span>
            <strong>{summary.total}</strong>
          </div>

          <small>Recorded incidents</small>
        </div>

        <div className="incident-stat-card danger">
          <div className="incident-stat-icon danger">
            <ShieldAlert size={20} />
          </div>

          <div>
            <span>High / Critical</span>
            <strong>{summary.highCritical}</strong>
          </div>

          <small>Priority threats</small>
        </div>

        <div className="incident-stat-card cyan">
          <div className="incident-stat-icon cyan">
            <ShieldCheck size={20} />
          </div>

          <div>
            <span>Protection Actions</span>
            <strong>{summary.protectionActions}</strong>
          </div>

          <small>Automated decisions</small>
        </div>

        <div className="incident-stat-card warning">
          <div className="incident-stat-icon warning">
            <Ban size={20} />
          </div>

          <div>
            <span>Blocked</span>
            <strong>{summary.blocked}</strong>
          </div>

          <small>Blocked events</small>
        </div>

      </div>

      {/* INCIDENT LOG */}
      <div className="incident-panel">

        <div className="incident-panel-header">

          <div>
            <div className="incident-panel-title">
              <div className="incident-panel-title-icon">
                <ShieldAlert size={17} />
              </div>

              Incident Log
            </div>

            <p>
              Security events generated by the VoiceGuard analysis engine
            </p>
          </div>

          <div className="incident-count">
            {filteredIncidents.length} EVENTS
          </div>

        </div>

        {/* FILTER BAR */}
        <div className="incident-filter-bar">

          <div className="incident-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search incident, file or event type..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="incident-filter">

            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <ChevronDown size={15} />

          </div>

        </div>

        {/* LOADING */}
        {loading ? (
          <div className="incident-empty">

            <RefreshCw
              size={30}
              className="incident-spin"
            />

            <h3>Loading security incidents</h3>

            <p>
              Synchronizing with the VoiceGuard security engine...
            </p>

          </div>

        ) : incidents.length === 0 ? (

          /* NO INCIDENTS */
          <div className="incident-empty">

            <div className="incident-empty-icon safe">
              <ShieldCheck size={38} />
            </div>

            <h3>No security incidents</h3>

            <p>
              Analyze an audio recording to generate a security event.
            </p>

          </div>

        ) : filteredIncidents.length === 0 ? (

          /* NO SEARCH RESULTS */
          <div className="incident-empty">

            <div className="incident-empty-icon">
              <Search size={34} />
            </div>

            <h3>No matching incidents</h3>

            <p>
              Try changing your search text or risk filter.
            </p>

          </div>

        ) : (

          /* INCIDENT LIST */
          <div className="incident-list">

            {filteredIncidents.map((incident) => (

              <div
                key={incident.incident_id}
                className="incident-item"
              >

                {/* INCIDENT TOP */}
                <div className="incident-item-top">

                  <div className="incident-main">

                    <div
                      className={
                        "incident-action-icon " +
                        getActionClass(incident.action)
                      }
                    >
                      {getActionIcon(incident.action)}
                    </div>

                    <div className="incident-identity">

                      <div className="incident-id-row">

                        <h3>
                          {incident.incident_id}
                        </h3>

                        <span
                          className={
                            "incident-risk " +
                            getRiskClass(incident.risk_level)
                          }
                        >
                          {incident.risk_level}
                        </span>

                      </div>

                      <p className="incident-type">
                        {incident.incident_type}
                      </p>

                      <p className="incident-file">
                        <span>Audio</span>
                        {incident.filename}
                      </p>

                    </div>

                  </div>

                  <div className="incident-action">

                    <span>SECURITY ACTION</span>

                    <strong>
                      {incident.action}
                    </strong>

                  </div>

                </div>

                {/* METRICS */}
                <div className="incident-metrics">

                  <div className="incident-metric">

                    <span>CONFIDENCE</span>

                    <strong>
                      {(incident.confidence * 100).toFixed(1)}%
                    </strong>

                    <div className="incident-meter">
                      <div
                        style={{
                          width:
                            incident.confidence * 100 + "%",
                        }}
                      />
                    </div>

                  </div>

                  <div className="incident-metric">

                    <span>ANOMALY SCORE</span>

                    <strong>
                      {incident.anomaly_score}
                    </strong>

                  </div>

                  <div className="incident-metric">

                    <span>STATUS</span>

                    <strong className="incident-status-value">
                      <CheckCircle2 size={14} />
                      {incident.status}
                    </strong>

                  </div>

                  <div className="incident-metric">

                    <span>CREATED</span>

                    <strong className="incident-created">
                      <Clock size={14} />

                      {new Date(
                        incident.created_at
                      ).toLocaleString()}
                    </strong>

                  </div>

                </div>

                {/* HASH */}
                <div className="incident-hash">

                  <div className="incident-hash-title">
                    <Fingerprint size={14} />
                    SHA-256 AUDIO FINGERPRINT
                  </div>

                  <code>
                    {incident.audio_sha256}
                  </code>

                </div>

              </div>

            ))}

          </div>
        )}

      </div>

      {/* DISCLAIMER */}
      <div className="incident-disclaimer">

        <ShieldCheck size={16} />

        <p>
          Development-stage incident monitoring. SHA-256 provides
          an integrity fingerprint for analyzed audio; it does not
          independently prove that a voice recording is authentic.
        </p>

      </div>

    </div>
  );
}