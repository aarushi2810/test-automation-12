const path = require("path");
const { spawn } = require("child_process");

const pythonExecutable = process.env.PYTHON_EXECUTABLE || "python";
const modelPath = path.resolve(
  __dirname,
  process.env.MODEL_PATH || "../../ml_backend/model.pkl"
);
const scriptPath = path.resolve(__dirname, "../scripts/predict_model.py");

function runModelPrediction(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [scriptPath, modelPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start predictor: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Predictor exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(Number(parsed.predictedPower));
      } catch (error) {
        reject(new Error(`Invalid predictor response: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

module.exports = { runModelPrediction };
