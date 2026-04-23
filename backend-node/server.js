require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Message = require("./models/Message");
const Prediction = require("./models/Prediction");
const EnergyListing = require("./models/EnergyListing");
const { runModelPrediction } = require("./services/predictService");

const app = express();
const port = Number(process.env.PORT || 5001);
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGO_DB;
const passwordSaltRounds = 10;

app.use(cors());
app.use(express.json());

const validatePredictionPayload = (data) => {
  const requiredFields = ["irradiance", "temp", "prevHour", "prevDay", "roll3", "roll6"];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      return `missing field ${field}`;
    }

    if (Number.isNaN(Number(data[field]))) {
      return `${field} must be numeric`;
    }
  }

  return null;
};

// ── Health & Root ─────────────────────────────────────────────────

app.get("/", (_request, response) => {
  response.send("<h3>EcoCharge Node.js API running. Use /predict, /login, /register and /contact</h3>");
});

app.get("/health", async (_request, response) => {
  response.json({
    status: "running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// ── Auth ──────────────────────────────────────────────────────────

app.post("/register", async (request, response) => {
  try {
    const name = String(request.body.name || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "").trim();

    if (!name || !email || !password) {
      response.status(400).json({ error: "All fields are required" });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      response.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, passwordSaltRounds);
    await User.create({ name, email, passwordHash });

    response.status(201).json({ message: "Registration successful" });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/login", async (request, response) => {
  try {
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "").trim();

    if (!email || !password) {
      response.status(400).json({ error: "Email and password required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }

    response.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// ── Contact ───────────────────────────────────────────────────────

app.post("/contact", async (request, response) => {
  try {
    const name = String(request.body.name || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    const message = String(request.body.message || "").trim();

    if (!name || !email || !message) {
      response.status(400).json({ error: "name, email and message are required" });
      return;
    }

    await Message.create({ name, email, message });
    response.json({ status: "ok", message: "Thanks - message received." });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// ── ML Prediction ─────────────────────────────────────────────────

app.post("/predict", async (request, response) => {
  try {
    const validationError = validatePredictionPayload(request.body || {});
    if (validationError) {
      response.status(400).json({ error: validationError });
      return;
    }

    const payload = {
      irradiance: Number(request.body.irradiance),
      temp: Number(request.body.temp),
      prevHour: Number(request.body.prevHour),
      prevDay: Number(request.body.prevDay),
      roll3: Number(request.body.roll3),
      roll6: Number(request.body.roll6)
    };

    const predictedPower = await runModelPrediction(payload);

    await Prediction.create({
      ...payload,
      prediction: predictedPower
    });

    response.json({ predictedPower });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/logs", async (_request, response) => {
  try {
    const rows = await Prediction.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    response.json(
      rows.map((row) => ({
        id: row._id,
        irradiance: row.irradiance,
        temp: row.temp,
        prevHour: row.prevHour,
        prevDay: row.prevDay,
        roll3: row.roll3,
        roll6: row.roll6,
        prediction: row.prediction,
        timestamp: row.createdAt
      }))
    );
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// ── Energy Listings ───────────────────────────────────────────────

// GET /listings — public, browse all active listings (marketplace)
app.get("/listings", async (request, response) => {
  try {
    const listings = await EnergyListing.find({ status: "active" })
      .sort({ createdAt: -1 });
    response.json({ listings });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// GET /my-listings?userId=xxx — get all listings created by a user
app.get("/my-listings", async (request, response) => {
  try {
    const { userId } = request.query;
    if (!userId) {
      return response.status(400).json({ error: "userId is required" });
    }

    const listings = await EnergyListing.find({ userId })
      .sort({ createdAt: -1 });
    response.json({ listings });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// POST /listings — create a new energy listing
app.post("/listings", async (request, response) => {
  try {
    const {
      userId,
      apartmentName,
      unit,
      area,
      availableEnergy,
      pricePerKwh,
      timeSlot
    } = request.body;

    if (!userId || !apartmentName || !unit || !area || !availableEnergy || !pricePerKwh || !timeSlot) {
      return response.status(400).json({ error: "All fields are required." });
    }

    const listing = await EnergyListing.create({
      userId,
      apartmentName,
      unit,
      area,
      availableEnergy: parseFloat(availableEnergy),
      pricePerKwh: parseFloat(pricePerKwh),
      timeSlot,
      status: "active"
    });

    response.status(201).json({ listing });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// PATCH /listings/:id/status — toggle a listing active / inactive
app.patch("/listings/:id/status", async (request, response) => {
  try {
    const { userId, status } = request.body;

    if (!userId || !status) {
      return response.status(400).json({ error: "userId and status are required." });
    }

    const listing = await EnergyListing.findOne({
      _id: request.params.id,
      userId
    });

    if (!listing) {
      return response.status(404).json({ error: "Listing not found." });
    }

    listing.status = status;
    await listing.save();
    response.json({ listing });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// DELETE /listings/:id — delete a listing (only owner)
app.delete("/listings/:id", async (request, response) => {
  try {
    const { userId } = request.body;

    if (!userId) {
      return response.status(400).json({ error: "userId is required." });
    }

    const listing = await EnergyListing.findOneAndDelete({
      _id: request.params.id,
      userId
    });

    if (!listing) {
      return response.status(404).json({ error: "Listing not found." });
    }

    response.json({ message: "Listing deleted." });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// ── Start Server ──────────────────────────────────────────────────

async function startServer() {
  if (!mongoUri) {
    throw new Error("MongoDB connection string is not configured");
  }

  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`EcoCharge Node.js API listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
