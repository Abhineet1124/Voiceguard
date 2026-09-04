import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  BarChart3,
  FileAudio,
  Menu,
  Server,
  Shield,
  ShieldAlert,
  X,
} from "lucide-react";

import Dashboard from "./Dashboard";
import AnalysisPage from "./AnalysisPage";
import IncidentsPage from "./IncidentsPage";
import AnalyticsPage from "./AnalyticsPage";

type Page =
  | "dashboard"
  | "analyze"
  | "incidents"
  | "analytics";

interface HealthStatus {
  status: string;
  database: string;
  model_status: string;
  version: string;
}

const navigation = [
  {
    id: "dashboard" as Page,
    label: "Dashboard",
    description: "Security overview",
    icon: BarChart3,
  },
  {
    id: "analyze" as Page,
    label: "Analyze Voice",
    description: "Detect voice threats",
    icon: FileAudio,
  },
  {
    id: "incidents" as Page,
    label: "Incidents",
    description: "Security events",
    icon: ShieldAlert,
  },
  {
    id: "analytics" as Page,
    label: "Analytics",
    description: "Security intelligence",
    icon: BarChart3,
  },
];

export default function App() {
  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  const [health, setHealth] =
    useState<HealthStatus | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/health"
        );

        setHealth(response.data);
        setConnected(true);
      } catch (error) {
        console.error(
          "Backend health check failed:",
          error
        );

        setConnected(false);
        setHealth(null);
      }
    };

    checkHealth();

    const interval = setInterval(
      checkHealth,
      15000
    );

    return () => clearInterval(interval);
  }, []);

  const changePage = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;

      case "analyze":
        return <AnalysisPage />;

      case "incidents":
        return <IncidentsPage />;

      case "analytics":
        return <AnalyticsPage />;

      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard":
        return "Dashboard";

      case "analyze":
        return "Analyze Voice";

      case "incidents":
        return "Incidents";

      case "analytics":
        return "Analytics";

      default:
        return "Dashboard";
    }
  };

  return (
    <div className="app-shell">

      {/* =====================================================
          MOBILE HEADER
      ====================================================== */}

      <header className="mobile-header">

        <div className="mobile-brand">

          <div className="brand-logo">
            <Shield size={21} />
          </div>

          <div>
            <div className="brand-name">
              VOICEGUARD
            </div>

            <div className="brand-tagline">
              Detect. Verify. Prevent.
            </div>
          </div>

        </div>

        <button
          className="mobile-menu-button"
          onClick={() =>
            setMobileMenuOpen(!mobileMenuOpen)
          }
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <X size={21} />
          ) : (
            <Menu size={21} />
          )}
        </button>

      </header>


      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={
          "app-sidebar " +
          (mobileMenuOpen
            ? "sidebar-open"
            : "")
        }
      >

        {/* Brand */}

        <div className="sidebar-brand">

          <div className="brand-logo">
            <Shield size={23} />
          </div>

          <div>
            <div className="brand-name">
              VOICEGUARD
            </div>

            <div className="brand-tagline">
              Detect. Verify. Prevent.
            </div>
          </div>

        </div>


        {/* Navigation */}

        <div className="sidebar-section">

          <div className="sidebar-section-title">
            SECURITY CENTER
          </div>

          <nav className="sidebar-nav">

            {navigation.map(
              ({
                id,
                label,
                description,
                icon: Icon,
              }) => {

                const active =
                  currentPage === id;

                return (
                  <button
                    key={id}
                    onClick={() =>
                      changePage(id)
                    }
                    className={
                      "sidebar-nav-item " +
                      (active
                        ? "active"
                        : "")
                    }
                  >

                    <div className="sidebar-nav-icon">
                      <Icon size={19} />
                    </div>

                    <div className="sidebar-nav-text">

                      <span>
                        {label}
                      </span>

                      <small>
                        {description}
                      </small>

                    </div>

                    {active && (
                      <span className="nav-active-dot" />
                    )}

                  </button>
                );
              }
            )}

          </nav>

        </div>


        {/* System Status */}

        <div className="sidebar-bottom">

          <div className="sidebar-system-card">

            <div className="sidebar-system-header">

              <div className="sidebar-system-icon">
                <Server size={17} />
              </div>

              <span>
                SYSTEM STATUS
              </span>

            </div>


            <div className="sidebar-status-row">

              <span
                className={
                  connected
                    ? "status-dot"
                    : "status-dot offline"
                }
              />

              <span>
                {connected
                  ? "Backend Connected"
                  : "Backend Offline"}
              </span>

            </div>


            {health && (
              <div className="sidebar-health-details">

                <div>
                  <span>
                    Database
                  </span>

                  <strong>
                    {health.database}
                  </strong>
                </div>

                <div>
                  <span>
                    Model
                  </span>

                  <strong>
                    {health.model_status}
                  </strong>
                </div>

                <div>
                  <span>
                    Version
                  </span>

                  <strong>
                    {health.version}
                  </strong>
                </div>

              </div>
            )}

          </div>


          <div className="sidebar-footer">

            <Activity size={13} />

            <span>
              VOICEGUARD SECURITY PLATFORM
            </span>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN APPLICATION
      ====================================================== */}

      <div className="app-main">


        {/* ===================================================
            TOP BAR
        ==================================================== */}

        <div className="app-topbar">

          <div className="topbar-page-info">

            <span className="topbar-label">
              SECURITY PLATFORM
            </span>

            <span className="topbar-separator">
              /
            </span>

            <span className="topbar-current">
              {getPageTitle()}
            </span>

          </div>


          <div className="topbar-status">

            <span
              className={
                connected
                  ? "status-dot"
                  : "status-dot offline"
              }
            />

            <span>
              {connected
                ? "System Operational"
                : "Connection Lost"}
            </span>

          </div>

        </div>


        {/* ===================================================
            CONNECTION WARNING
        ==================================================== */}

        {!connected && (
          <div className="connection-warning">

            <div className="warning-symbol">
              !
            </div>

            <div>

              <strong>
                Backend connection unavailable
              </strong>

              <p>
                Make sure FastAPI is running on
                localhost:8000.
              </p>

            </div>

          </div>
        )}


        {/* ===================================================
            CURRENT PAGE
        ==================================================== */}

        <main className="app-page">
          {renderPage()}
        </main>

      </div>


      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileMenuOpen && (
        <button
          className="sidebar-overlay"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          aria-label="Close navigation"
        />
      )}

    </div>
  );
}