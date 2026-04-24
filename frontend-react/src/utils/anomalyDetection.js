/**
 * Anomaly Detection Engine for EcoCharge
 *
 * Analyses the user's prediction history to detect unusual output values.
 * Uses irradiance-bucketed Z-score analysis, trend deviation, and
 * day-over-day comparison to generate human-readable alerts.
 */

// ── Severity thresholds ──────────────────────────────────────────

const Z_THRESHOLD_WARNING = 1.3;   // > 1.3σ below mean → warning
const Z_THRESHOLD_CRITICAL = 2.0;  // > 2.0σ below mean → critical
const TREND_DROP_PERCENT = 25;     // 25 %+ drop from rolling avg → alert
const MIN_HISTORY_FOR_ALERTS = 3;  // need at least 3 entries

// ── Helpers ──────────────────────────────────────────────────────

const mean = (values) =>
  values.reduce((s, v) => s + v, 0) / (values.length || 1);

const stdDev = (values) => {
  const avg = mean(values);
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squareDiffs));
};

/**
 * Bucket irradiance into coarse groups so we compare
 * outputs under similar sunlight conditions.
 */
const irradianceBucket = (irradiance) => {
  if (irradiance < 400) return "low";
  if (irradiance < 700) return "medium";
  return "high";
};

const formatDate = (dateStr) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dateStr));

// ── Core Detection ───────────────────────────────────────────────

/**
 * Detect anomalies in a prediction history array.
 *
 * Each entry shape: { id, date, irradiance, temp, output }
 *
 * Returns an array of alert objects sorted newest-first:
 *   { id, severity, title, message, metric, expected, actual, date }
 */
export function detectAnomalies(history) {
  if (!history || history.length < MIN_HISTORY_FOR_ALERTS) {
    return [];
  }

  const alerts = [];

  // Group outputs by irradiance bucket
  const buckets = {};
  history.forEach((entry) => {
    const bucket = irradianceBucket(entry.irradiance);
    if (!buckets[bucket]) buckets[bucket] = [];
    buckets[bucket].push(entry);
  });

  // ── 1. Z-score anomaly (per irradiance bucket) ────────────────
  const latest = history[0]; // history is sorted newest-first
  const latestBucket = irradianceBucket(latest.irradiance);
  const peers = buckets[latestBucket] || [];

  if (peers.length >= 2) {
    const outputs = peers.map((p) => p.output);
    const avg = mean(outputs);
    const sd = stdDev(outputs);

    if (sd > 0.01) {
      const zScore = (avg - latest.output) / sd; // positive = below mean

      if (zScore >= Z_THRESHOLD_CRITICAL) {
        alerts.push({
          id: `z-critical-${latest.id}`,
          severity: "critical",
          title: "Output significantly below normal",
          message: `Your latest output (${latest.output.toFixed(2)} kW) is ${(zScore).toFixed(1)}σ below the average for ${latestBucket}-irradiance conditions (${avg.toFixed(2)} kW avg). Possible panel issue or shading obstruction.`,
          metric: "output",
          expected: avg,
          actual: latest.output,
          date: latest.date,
        });
      } else if (zScore >= Z_THRESHOLD_WARNING) {
        alerts.push({
          id: `z-warning-${latest.id}`,
          severity: "warning",
          title: "Output below expected range",
          message: `Your latest output (${latest.output.toFixed(2)} kW) is ${((1 - latest.output / avg) * 100).toFixed(0)}% below the average for similar irradiance (${avg.toFixed(2)} kW). Monitor for further drops.`,
          metric: "output",
          expected: avg,
          actual: latest.output,
          date: latest.date,
        });
      }
    }
  }

  // ── 2. Trend deviation (rolling average comparison) ───────────
  if (history.length >= 4) {
    const recentOutputs = history.slice(0, 3).map((e) => e.output);
    const olderOutputs = history.slice(3).map((e) => e.output);
    const recentAvg = mean(recentOutputs);
    const olderAvg = mean(olderOutputs);

    if (olderAvg > 0.05) {
      const dropPercent = ((olderAvg - recentAvg) / olderAvg) * 100;

      if (dropPercent >= TREND_DROP_PERCENT) {
        alerts.push({
          id: `trend-drop-${latest.id}`,
          severity: dropPercent >= 40 ? "critical" : "warning",
          title: "Declining generation trend",
          message: `Your last 3 predictions average ${recentAvg.toFixed(2)} kW — that's ${dropPercent.toFixed(0)}% below your historical average of ${olderAvg.toFixed(2)} kW. Consider checking panel cleanliness or weather patterns.`,
          metric: "trend",
          expected: olderAvg,
          actual: recentAvg,
          date: latest.date,
        });
      }
    }
  }

  // ── 3. Day-over-day comparison ────────────────────────────────
  if (history.length >= 2) {
    const today = history[0];
    const yesterday = history[1];

    if (yesterday.output > 0.05) {
      const dayDrop = ((yesterday.output - today.output) / yesterday.output) * 100;

      if (dayDrop >= 30 && Math.abs(today.irradiance - yesterday.irradiance) < 150) {
        alerts.push({
          id: `day-drop-${today.id}`,
          severity: dayDrop >= 50 ? "critical" : "warning",
          title: "Sharp drop from previous reading",
          message: `Output dropped ${dayDrop.toFixed(0)}% from ${yesterday.output.toFixed(2)} kW (${formatDate(yesterday.date)}) to ${today.output.toFixed(2)} kW (${formatDate(today.date)}) despite similar irradiance. Investigate inverter or connection issues.`,
          metric: "day-change",
          expected: yesterday.output,
          actual: today.output,
          date: today.date,
        });
      }
    }
  }

  // ── 4. High-efficiency opportunity ────────────────────────────
  if (latest.irradiance >= 800 && latest.output >= mean(history.map((e) => e.output)) * 1.15) {
    alerts.push({
      id: `opportunity-${latest.id}`,
      severity: "info",
      title: "Peak generation — great time to share!",
      message: `Output is ${latest.output.toFixed(2)} kW at ${latest.irradiance} W/m² irradiance — 15%+ above your average. Consider listing surplus energy on the marketplace.`,
      metric: "opportunity",
      expected: null,
      actual: latest.output,
      date: latest.date,
    });
  }

  // ── 5. System healthy (if no issues) ──────────────────────────
  if (alerts.length === 0) {
    alerts.push({
      id: `healthy-${Date.now()}`,
      severity: "healthy",
      title: "All systems nominal",
      message: `Generation is within expected ranges. Latest output: ${latest.output.toFixed(2)} kW at ${latest.irradiance} W/m² irradiance.`,
      metric: "status",
      expected: null,
      actual: latest.output,
      date: latest.date,
    });
  }

  return alerts;
}

/**
 * Get a summary object from alerts for dashboard stat cards.
 */
export function getAlertSummary(alerts) {
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.filter((a) => a.severity === "warning").length;
  const info = alerts.filter((a) => a.severity === "info").length;
  const healthy = alerts.filter((a) => a.severity === "healthy").length;

  let overallStatus = "healthy";
  if (critical > 0) overallStatus = "critical";
  else if (warning > 0) overallStatus = "warning";
  else if (info > 0) overallStatus = "info";

  return { critical, warning, info, healthy, overallStatus, total: alerts.length };
}
