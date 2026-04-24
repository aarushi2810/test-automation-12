import { useState } from "react";
import "./CreateListingModal.css";

const CreateListingModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    apartmentName: "",
    unit: "",
    area: "",
    availableEnergy: "",
    pricePerKwh: "",
    timeSlot: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { apartmentName, unit, area, availableEnergy, pricePerKwh, timeSlot } = form;
    if (!apartmentName || !unit || !area || !availableEnergy || !pricePerKwh || !timeSlot) {
      setError("Please fill in all fields.");
      return;
    }
    if (isNaN(availableEnergy) || isNaN(pricePerKwh)) {
      setError("Energy and price must be valid numbers.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        apartmentName,
        unit,
        area,
        availableEnergy: parseFloat(availableEnergy),
        pricePerKwh: parseFloat(pricePerKwh),
        timeSlot,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create listing. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <p className="modal-label">SHARE ENERGY</p>
        <h2 className="modal-title">Create Listing</h2>

        <div className="modal-grid">
          <div className="modal-field">
            <label>APARTMENT NAME</label>
            <input
              name="apartmentName"
              placeholder="Skyline Residency"
              value={form.apartmentName}
              onChange={handleChange}
            />
          </div>
          <div className="modal-field">
            <label>UNIT</label>
            <input
              name="unit"
              placeholder="Tower B · 904"
              value={form.unit}
              onChange={handleChange}
            />
          </div>
          <div className="modal-field">
            <label>AREA</label>
            <input
              name="area"
              placeholder="Baner"
              value={form.area}
              onChange={handleChange}
            />
          </div>
          <div className="modal-field">
            <label>AVAILABLE ENERGY (KWH)</label>
            <input
              name="availableEnergy"
              type="number"
              placeholder="15"
              value={form.availableEnergy}
              onChange={handleChange}
            />
          </div>
          <div className="modal-field">
            <label>PRICE PER KWH (₹)</label>
            <input
              name="pricePerKwh"
              type="number"
              step="0.01"
              placeholder="7.25"
              value={form.pricePerKwh}
              onChange={handleChange}
            />
          </div>
          <div className="modal-field">
            <label>TIME SLOT</label>
            <input
              name="timeSlot"
              placeholder="18:00 - 21:00"
              value={form.timeSlot}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button
            className="btn-share"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Sharing..." : "Share listing"}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;
