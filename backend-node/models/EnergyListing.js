// models/EnergyListing.js

const mongoose = require("mongoose");

const energyListingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    apartmentName: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    availableEnergy: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerKwh: {
      type: Number,
      required: true,
      min: 0,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "reserved", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EnergyListing", energyListingSchema);
