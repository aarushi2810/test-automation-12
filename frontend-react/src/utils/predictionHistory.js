const STORAGE_KEY = "ecocharge.predictionHistory";
const HISTORY_LIMIT = 24;

const seedHistory = [
  { id: 1, date: "2026-04-08", irradiance: 705, temp: 29, output: 0.63 },
  { id: 2, date: "2026-04-09", irradiance: 748, temp: 30, output: 0.7 },
  { id: 3, date: "2026-04-10", irradiance: 790, temp: 32, output: 0.78 },
  { id: 4, date: "2026-04-11", irradiance: 735, temp: 28, output: 0.67 }
];

const isBrowser = typeof window !== "undefined";

const sortHistory = (history) =>
  [...history].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return Number(right.id) - Number(left.id);
  });

const normalizeEntry = (entry, index) => ({
  id: entry.id ?? Date.now() + index,
  date: entry.date ?? new Date().toISOString().split("T")[0],
  irradiance: Number(entry.irradiance ?? 0),
  temp: Number(entry.temp ?? entry.temperature ?? 0),
  output: Number(entry.output ?? entry.prediction ?? 0)
});

const persistHistory = (history) => {
  if (!isBrowser) {
    return history;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  window.dispatchEvent(new CustomEvent("prediction-history-updated"));
  return history;
};

export const getPredictionHistory = () => {
  if (!isBrowser) {
    return seedHistory;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return persistHistory(sortHistory(seedHistory));
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return persistHistory(sortHistory(seedHistory));
    }

    return sortHistory(parsed.map(normalizeEntry));
  } catch (error) {
    console.error("Failed to parse prediction history", error);
    return persistHistory(sortHistory(seedHistory));
  }
};

export const addPredictionEntry = ({ irradiance, temperature, output }) => {
  const nextEntry = normalizeEntry({
    id: Date.now(),
    date: new Date().toISOString().split("T")[0],
    irradiance,
    temp: temperature,
    output
  });

  const nextHistory = sortHistory([nextEntry, ...getPredictionHistory()]).slice(0, HISTORY_LIMIT);
  persistHistory(nextHistory);
  return nextEntry;
};

export const subscribeToPredictionHistory = (callback) => {
  if (!isBrowser) {
    return () => {};
  }

  const handleUpdate = () => callback(getPredictionHistory());

  window.addEventListener("storage", handleUpdate);
  window.addEventListener("prediction-history-updated", handleUpdate);

  return () => {
    window.removeEventListener("storage", handleUpdate);
    window.removeEventListener("prediction-history-updated", handleUpdate);
  };
};

export const getPredictionAnalytics = (history) => {
  const safeHistory = history.length ? history : [];
  const outputs = safeHistory.map((item) => item.output);
  const totalPredictions = safeHistory.length;
  const avgOutput =
    outputs.reduce((sum, value) => sum + value, 0) / (outputs.length || 1);
  const maxOutput = outputs.length ? Math.max(...outputs) : 0;
  const bestDayRecord = safeHistory.reduce(
    (best, item) => (item.output > best.output ? item : best),
    safeHistory[0] || { date: "N/A", output: 0 }
  );

  return {
    totalPredictions,
    avgOutput,
    maxOutput,
    bestDay: bestDayRecord.date,
    latestOutput: safeHistory[0]?.output ?? 0
  };
};

export const getTodayGeneration = (history) => {
  const today = new Date().toISOString().split("T")[0];

  return history
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + item.output, 0);
};
