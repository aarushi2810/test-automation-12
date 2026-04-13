import React, { useEffect, useMemo, useState } from "react";
import "../styles/page.css";
import {
  addPredictionEntry,
  getPredictionAnalytics,
  getPredictionHistory,
  getTodayGeneration,
  subscribeToPredictionHistory
} from "../utils/predictionHistory";

const liveSeries = [0.18, 0.34, 0.49, 0.62, 0.58, 0.74, 0.8];

const initialInputs = {
  irradiance: 780,
  temperature: 31,
  previousHour: 0.72,
  previousDay: 0.69,
  rollingAverage: 0.64
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);

const formatBestDay = (value) => {
  if (!value || value === "N/A") {
    return "No data";
  }

  return formatDate(new Date(value));
};

export default function Dashboard() {
  const [inputs, setInputs] = useState(initialInputs);
  const [predictionResult, setPredictionResult] = useState(null);
  const [history, setHistory] = useState(() => getPredictionHistory());

  useEffect(() => subscribeToPredictionHistory(setHistory), []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setInputs((current) => ({ ...current, [name]: Number(value) }));
  };

  const analytics = useMemo(() => getPredictionAnalytics(history), [history]);
  const todayGeneration = useMemo(() => getTodayGeneration(history), [history]);

  const generatePrediction = () => {
    const estimatedOutput =
      inputs.irradiance * 0.00058 +
      inputs.previousHour * 0.22 +
      inputs.previousDay * 0.12 +
      inputs.rollingAverage * 0.18 -
      inputs.temperature * 0.0065;

    const safeOutput = Math.max(0.12, Number(estimatedOutput.toFixed(2)));
    setPredictionResult(safeOutput);
    addPredictionEntry({
      irradiance: inputs.irradiance,
      temperature: inputs.temperature,
      output: safeOutput
    });
  };

  return (
    <div className="page-dashboard">
      <section className="dashboard-hero-card">
        <div className="dashboard-live-panel">
          <div className="dashboard-section-label">
            <span className="live-dot" />
            Live
          </div>
          <p className="dashboard-eyebrow">Present generation</p>
          <h1>Current output</h1>
          <div className="dashboard-current-output">
            {analytics.latestOutput.toFixed(2)} kW
          </div>
          <p className="dashboard-support">
            Rooftop generation is healthy and trending above yesterday’s midday
            curve.
          </p>
        </div>

        <div className="dashboard-live-stats">
          <div className="metric-glow-card">
            <span>Today so far</span>
            <strong>{todayGeneration.toFixed(1)} kWh</strong>
          </div>
          <div className="metric-glow-card">
            <span>Peak output</span>
            <strong>{analytics.maxOutput.toFixed(2)} kW</strong>
          </div>
          <div className="metric-glow-card">
            <span>Efficiency</span>
            <strong>93%</strong>
          </div>
        </div>

        <div className="dashboard-graph-card">
          <div className="dashboard-graph-head">
            <h2>Generation trend</h2>
            <span>Last 7 intervals</span>
          </div>
          <div className="sparkline-bars" aria-hidden="true">
            {liveSeries.map((value, index) => (
              <div key={index} className="sparkline-bar-wrap">
                <div
                  className="sparkline-bar"
                  style={{ height: `${Math.max(18, value * 130)}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid-layout">
        <div className="dashboard-card prediction-panel">
          <div className="dashboard-card-head">
            <p className="dashboard-eyebrow">Prediction panel</p>
            <h2>Generate AC output forecast</h2>
            <p>
              Tune the environmental values below to estimate near-term solar
              generation.
            </p>
          </div>

          <div className="prediction-input-grid">
            <label className="slider-field">
              <div className="slider-row">
                <span>Irradiance</span>
                <strong>{inputs.irradiance} W/m²</strong>
              </div>
              <input
                type="range"
                name="irradiance"
                min="200"
                max="1100"
                value={inputs.irradiance}
                onChange={handleInputChange}
              />
            </label>

            <label className="slider-field">
              <div className="slider-row">
                <span>Temperature</span>
                <strong>{inputs.temperature}°C</strong>
              </div>
              <input
                type="range"
                name="temperature"
                min="10"
                max="45"
                value={inputs.temperature}
                onChange={handleInputChange}
              />
            </label>

            <label className="slider-field">
              <div className="slider-row">
                <span>Previous hour</span>
                <strong>{inputs.previousHour} kW</strong>
              </div>
              <input
                type="range"
                name="previousHour"
                min="0"
                max="2"
                step="0.01"
                value={inputs.previousHour}
                onChange={handleInputChange}
              />
            </label>

            <label className="slider-field">
              <div className="slider-row">
                <span>Previous day</span>
                <strong>{inputs.previousDay} kW</strong>
              </div>
              <input
                type="range"
                name="previousDay"
                min="0"
                max="2"
                step="0.01"
                value={inputs.previousDay}
                onChange={handleInputChange}
              />
            </label>

            <label className="slider-field">
              <div className="slider-row">
                <span>Rolling averages</span>
                <strong>{inputs.rollingAverage} kW</strong>
              </div>
              <input
                type="range"
                name="rollingAverage"
                min="0"
                max="2"
                step="0.01"
                value={inputs.rollingAverage}
                onChange={handleInputChange}
              />
            </label>
          </div>

          <button type="button" className="energy-button" onClick={generatePrediction}>
            Generate Prediction
          </button>

          {predictionResult !== null ? (
            <div className="prediction-result-card">
              <span>Estimated AC Output</span>
              <strong>{predictionResult} kW</strong>
            </div>
          ) : null}
        </div>

        <div className="dashboard-side-column">
          <div className="analytics-grid">
            <div className="dashboard-card analytics-card">
              <span>Total predictions</span>
              <strong>{analytics.totalPredictions}</strong>
            </div>
            <div className="dashboard-card analytics-card">
              <span>Avg output</span>
              <strong>{analytics.avgOutput.toFixed(2)} kW</strong>
            </div>
            <div className="dashboard-card analytics-card">
              <span>Max output</span>
              <strong>{analytics.maxOutput.toFixed(2)} kW</strong>
            </div>
            <div className="dashboard-card analytics-card">
              <span>Best day</span>
              <strong>{formatBestDay(analytics.bestDay)}</strong>
            </div>
          </div>

          <div className="dashboard-card history-card">
            <div className="dashboard-card-head">
              <p className="dashboard-eyebrow">History</p>
              <h2>Recent predictions</h2>
            </div>

            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Irradiance</th>
                    <th>Temp</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(new Date(item.date))}</td>
                      <td>{item.irradiance}</td>
                      <td>{item.temp}°C</td>
                      <td>{item.output.toFixed(2)} kW</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
