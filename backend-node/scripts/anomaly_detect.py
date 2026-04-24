"""
Anomaly Detection Script — uses the trained RandomForestRegressor model
to compute expected output and flag deviations as anomalies.

Called by Node.js via child_process (same pattern as predict_model.py).

Input  (stdin JSON):
  { "history": [ { irradiance, temp, prevHour, prevDay, roll3, roll6, output }, ... ] }

Output (stdout JSON):
  { "alerts": [ { severity, title, message, expected, actual, date, confidence }, ... ] }
"""

import json
import pickle
import sys
import numpy as np


def load_model(path):
    with open(path, "rb") as f:
        return pickle.load(f)


def compute_alerts(model, history):
    """Use the ML model to detect anomalies in prediction history."""
    if not history or len(history) < 2:
        return [{
            "severity": "healthy",
            "title": "Insufficient data",
            "message": "Need at least 2 prediction entries to run anomaly detection.",
            "expected": None,
            "actual": None,
            "confidence": 0,
            "metric": "status"
        }]

    alerts = []

    # ── Compute ML-predicted expected output for each entry ─────────
    entries_with_predictions = []
    for entry in history:
        try:
            features = np.array([[
                float(entry.get("irradiance", 0)),
                float(entry.get("temp", 0)),
                float(entry.get("prevHour", 0)),
                float(entry.get("prevDay", 0)),
                float(entry.get("roll3", 0)),
                float(entry.get("roll6", 0)),
            ]])
            ml_expected = float(model.predict(features)[0])
            actual = float(entry.get("output", 0))
            entries_with_predictions.append({
                **entry,
                "ml_expected": ml_expected,
                "actual": actual,
                "residual": actual - ml_expected,
                "pct_deviation": ((actual - ml_expected) / ml_expected * 100)
                                 if ml_expected > 0.01 else 0
            })
        except (ValueError, KeyError):
            continue

    if not entries_with_predictions:
        return [{"severity": "healthy", "title": "No valid entries", "message": "Could not process history entries.", "expected": None, "actual": None, "confidence": 0, "metric": "status"}]

    # ── Compute residual statistics ────────────────────────────────
    residuals = [e["residual"] for e in entries_with_predictions]
    mean_residual = np.mean(residuals)
    std_residual = np.std(residuals) if len(residuals) > 1 else 0.1

    # ── 1. Check latest entry vs ML prediction ────────────────────
    latest = entries_with_predictions[0]
    z_score = (latest["residual"] - mean_residual) / std_residual if std_residual > 0.01 else 0

    if latest["pct_deviation"] < -30 and z_score < -1.5:
        alerts.append({
            "severity": "critical",
            "title": "Output critically below ML prediction",
            "message": (
                f"The ML model expected {latest['ml_expected']:.2f} kW for current conditions "
                f"(irradiance: {latest.get('irradiance', 'N/A')} W/m², temp: {latest.get('temp', 'N/A')}°C), "
                f"but actual output is {latest['actual']:.2f} kW — "
                f"{abs(latest['pct_deviation']):.0f}% below prediction. "
                f"Possible panel degradation, inverter fault, or unexpected shading."
            ),
            "expected": latest["ml_expected"],
            "actual": latest["actual"],
            "confidence": min(95, 60 + abs(z_score) * 10),
            "metric": "ml_deviation"
        })
    elif latest["pct_deviation"] < -15 and z_score < -1.0:
        alerts.append({
            "severity": "warning",
            "title": "Output below ML prediction",
            "message": (
                f"ML model predicted {latest['ml_expected']:.2f} kW but actual is "
                f"{latest['actual']:.2f} kW ({abs(latest['pct_deviation']):.0f}% below). "
                f"Monitor for further degradation."
            ),
            "expected": latest["ml_expected"],
            "actual": latest["actual"],
            "confidence": min(90, 50 + abs(z_score) * 10),
            "metric": "ml_deviation"
        })

    # ── 2. Trending degradation (ML residuals getting worse) ──────
    if len(entries_with_predictions) >= 4:
        recent_residuals = [e["residual"] for e in entries_with_predictions[:3]]
        older_residuals = [e["residual"] for e in entries_with_predictions[3:]]
        recent_avg = np.mean(recent_residuals)
        older_avg = np.mean(older_residuals)

        if recent_avg < older_avg - std_residual * 0.8:
            alerts.append({
                "severity": "warning",
                "title": "Declining performance trend detected",
                "message": (
                    f"Recent predictions deviate {abs(recent_avg - older_avg):.2f} kW more "
                    f"from ML expectations than your historical baseline. "
                    f"The model suggests a systematic efficiency decline."
                ),
                "expected": older_avg,
                "actual": recent_avg,
                "confidence": min(85, 55 + abs(recent_avg - older_avg) / (std_residual + 0.01) * 15),
                "metric": "trend"
            })

    # ── 3. Positive anomaly — surplus opportunity ─────────────────
    if latest["pct_deviation"] > 15 and z_score > 1.0:
        alerts.append({
            "severity": "info",
            "title": "Output exceeding ML prediction — surplus detected",
            "message": (
                f"Actual output ({latest['actual']:.2f} kW) is {latest['pct_deviation']:.0f}% "
                f"above the ML prediction ({latest['ml_expected']:.2f} kW). "
                f"Optimal conditions — consider sharing surplus energy on the marketplace."
            ),
            "expected": latest["ml_expected"],
            "actual": latest["actual"],
            "confidence": min(90, 55 + z_score * 10),
            "metric": "surplus"
        })

    # ── 4. Feature importance insight ─────────────────────────────
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        feature_names = ["Irradiance", "Temperature", "Prev Hour", "Prev Day", "Roll 3h", "Roll 6h"]
        top_idx = int(np.argmax(importances))
        alerts.append({
            "severity": "info",
            "title": "Model insight",
            "message": (
                f"The ML model (RandomForest, {getattr(model, 'n_estimators', '?')} trees) "
                f"identifies '{feature_names[top_idx]}' as the strongest predictor "
                f"({importances[top_idx]*100:.1f}% importance). "
                f"R² score confidence across all features."
            ),
            "expected": None,
            "actual": None,
            "confidence": 95,
            "metric": "model_info"
        })

    # ── 5. All clear ──────────────────────────────────────────────
    if not any(a["severity"] in ("critical", "warning") for a in alerts):
        alerts.append({
            "severity": "healthy",
            "title": "All systems nominal",
            "message": (
                f"Output ({latest['actual']:.2f} kW) is within expected ML prediction range "
                f"({latest['ml_expected']:.2f} kW ± {std_residual:.2f}). No anomalies detected."
            ),
            "expected": latest["ml_expected"],
            "actual": latest["actual"],
            "confidence": min(95, 70 + len(entries_with_predictions) * 2),
            "metric": "status"
        })

    return alerts


def main():
    if len(sys.argv) < 2:
        raise ValueError("Model path argument is required")

    model = load_model(sys.argv[1])
    payload = json.loads(sys.stdin.read())
    history = payload.get("history", [])

    alerts = compute_alerts(model, history)
    sys.stdout.write(json.dumps({"alerts": alerts}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
