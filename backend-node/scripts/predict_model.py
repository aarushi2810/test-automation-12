import json
import pickle
import sys

import numpy as np


def main():
    if len(sys.argv) < 2:
        raise ValueError("Model path argument is required")

    model_path = sys.argv[1]
    payload = json.loads(sys.stdin.read())

    with open(model_path, "rb") as model_file:
        model = pickle.load(model_file)

    features = np.array([[
        float(payload["irradiance"]),
        float(payload["temp"]),
        float(payload["prevHour"]),
        float(payload["prevDay"]),
        float(payload["roll3"]),
        float(payload["roll6"]),
    ]])

    prediction = float(model.predict(features)[0])
    sys.stdout.write(json.dumps({"predictedPower": prediction}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
