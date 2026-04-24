import { useMemo } from "react";
import { detectAnomalies, getAlertSummary } from "../utils/anomalyDetection";
import "./AnomalyAlerts.css";

// ── Icon SVGs (inline to avoid extra dependencies) ───────────────

const icons = {
  critical: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2L18 17H2L10 2Z"
        stroke="#fca5a5"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="rgba(239,68,68,0.15)"
      />
      <path d="M10 8v4" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="0.75" fill="#fca5a5" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#fcd34d" strokeWidth="1.5" fill="rgba(252,211,77,0.1)" />
      <path d="M10 6.5v4" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="13" r="0.75" fill="#fcd34d" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#93c5fd" strokeWidth="1.5" fill="rgba(147,197,253,0.1)" />
      <path d="M10 9v5" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.75" fill="#93c5fd" />
    </svg>
  ),
  healthy: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#86efac" strokeWidth="1.5" fill="rgba(134,239,172,0.1)" />
      <path d="M6.5 10.5L9 13L14 7" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const severityOrder = { critical: 0, warning: 1, info: 2, healthy: 3 };

const formatAlertDate = (dateStr) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));

// ── Component ────────────────────────────────────────────────────

export default function AnomalyAlerts({ history }) {
  const alerts = useMemo(() => detectAnomalies(history), [history]);
  const summary = useMemo(() => getAlertSummary(alerts), [alerts]);

  const sorted = useMemo(
    () =>
      [...alerts].sort(
        (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
      ),
    [alerts]
  );

  return (
    <div className="anomaly-panel">
      {/* Header */}
      <div className="anomaly-header">
        <div className="anomaly-header-left">
          <p className="dashboard-eyebrow">Anomaly detection</p>
          <h2>System Health & Alerts</h2>
        </div>
        <div className={`anomaly-status-badge anomaly-status--${summary.overallStatus}`}>
          {icons[summary.overallStatus]}
          <span>
            {summary.overallStatus === "healthy"
              ? "All Clear"
              : summary.overallStatus === "critical"
              ? `${summary.critical} Critical`
              : summary.overallStatus === "warning"
              ? `${summary.warning} Warning${summary.warning > 1 ? "s" : ""}`
              : "Info"}
          </span>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="anomaly-stats-row">
        <div className="anomaly-stat anomaly-stat--critical">
          <span className="anomaly-stat-count">{summary.critical}</span>
          <span className="anomaly-stat-label">Critical</span>
        </div>
        <div className="anomaly-stat anomaly-stat--warning">
          <span className="anomaly-stat-count">{summary.warning}</span>
          <span className="anomaly-stat-label">Warnings</span>
        </div>
        <div className="anomaly-stat anomaly-stat--info">
          <span className="anomaly-stat-count">{summary.info}</span>
          <span className="anomaly-stat-label">Info</span>
        </div>
        <div className="anomaly-stat anomaly-stat--healthy">
          <span className="anomaly-stat-count">{summary.healthy}</span>
          <span className="anomaly-stat-label">Clear</span>
        </div>
      </div>

      {/* Alert cards */}
      <div className="anomaly-alerts-list">
        {sorted.map((alert) => (
          <div key={alert.id} className={`anomaly-alert anomaly-alert--${alert.severity}`}>
            <div className="anomaly-alert-icon">{icons[alert.severity]}</div>
            <div className="anomaly-alert-body">
              <div className="anomaly-alert-top">
                <h4 className="anomaly-alert-title">{alert.title}</h4>
                <span className="anomaly-alert-date">{formatAlertDate(alert.date)}</span>
              </div>
              <p className="anomaly-alert-message">{alert.message}</p>
              {alert.expected != null && (
                <div className="anomaly-alert-metrics">
                  <span>
                    Expected: <strong>{alert.expected.toFixed(2)} kW</strong>
                  </span>
                  <span className="anomaly-metric-divider">→</span>
                  <span>
                    Actual: <strong>{alert.actual.toFixed(2)} kW</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
