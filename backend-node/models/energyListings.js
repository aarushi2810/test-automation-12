// routes/energyListings.js
// Add these routes to your existing energy router, or create a new router and mount it.

const express = require("express");
const router = express.Router();
const EnergyListing = require("../models/EnergyListing"); // see model below
const authMiddleware = require("../middleware/auth"); // your existing JWT middleware

// ── GET /api/energy/listings ─────────────────────────────────────
// Public: Browse all active listings (existing marketplace feature)
router.get("/listings", async (req, res) => {
  try {
    const listings = await EnergyListing.find({ status: "active" }).sort({
      createdAt: -1,
    });
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/energy/my-listings ──────────────────────────────────
// Private: Get only the logged-in user's own listings
router.get("/my-listings", authMiddleware, async (req, res) => {
  try {
    const listings = await EnergyListing.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/energy/listings ────────────────────────────────────
// Private: Create a new listing
router.post("/listings", authMiddleware, async (req, res) => {
  try {
    const { apartmentName, unit, area, availableEnergy, pricePerKwh, timeSlot } =
      req.body;

    if (!apartmentName || !unit || !area || !availableEnergy || !pricePerKwh || !timeSlot) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const listing = new EnergyListing({
      userId: req.user.id,
      apartmentName,
      unit,
      area,
      availableEnergy: parseFloat(availableEnergy),
      pricePerKwh: parseFloat(pricePerKwh),
      timeSlot,
      status: "active",
    });

    await listing.save();
    res.status(201).json({ listing });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PATCH /api/energy/listings/:id/status ───────────────────────
// Private: Toggle listing active/inactive
router.patch("/listings/:id/status", authMiddleware, async (req, res) => {
  try {
    const listing = await EnergyListing.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!listing) return res.status(404).json({ message: "Listing not found." });

    listing.status = req.body.status || (listing.status === "active" ? "inactive" : "active");
    await listing.save();
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /api/energy/listings/:id ─────────────────────────────
// Private: Delete a listing (only owner can delete)
router.delete("/listings/:id", authMiddleware, async (req, res) => {
  try {
    const listing = await EnergyListing.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!listing) return res.status(404).json({ message: "Listing not found." });
    res.json({ message: "Listing deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
