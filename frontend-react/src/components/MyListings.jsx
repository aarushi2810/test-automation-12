import { useState, useEffect } from "react";
import CreateListingModal from "./CreateListingModal";
import "./MyListings.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch listings on mount
  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const userId = JSON.parse(localStorage.getItem("user"))?.id;
      const res = await fetch(`${API_BASE}/my-listings?userId=${userId}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (formData) => {
    const userId = JSON.parse(localStorage.getItem("user"))?.id;
    const res = await fetch(`${API_BASE}/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...formData, userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create listing");
    }
    await fetchMyListings(); // Refresh listings after creation
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      const userId = JSON.parse(localStorage.getItem("user"))?.id;
      await fetch(`${API_BASE}/listings/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setListings((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const userId = JSON.parse(localStorage.getItem("user"))?.id;
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await fetch(`${API_BASE}/listings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      setListings((prev) =>
        prev.map((l) => (l._id === id ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Derived stats
  const totalEnergy = listings.reduce((s, l) => s + (l.availableEnergy || 0), 0);
  const avgPrice =
    listings.length > 0
      ? listings.reduce((s, l) => s + (l.pricePerKwh || 0), 0) / listings.length
      : 0;
  const activeCount = listings.filter((l) => l.status === "active").length;

  // Filtered & searched listings
  const displayed = listings.filter((l) => {
    const matchStatus = filter === "all" || l.status === filter;
    const matchSearch =
      !search ||
      l.apartmentName?.toLowerCase().includes(search.toLowerCase()) ||
      l.area?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="my-listings">
      {/* Hero + Stats */}
      <div className="ml-hero">
        <div className="ml-hero-left">
          <p className="ml-label">MARKETPLACE</p>
          <h1 className="ml-title">
            Share surplus energy<br />with nearby residents.
          </h1>
          <p className="ml-subtitle">
            Publish available capacity, compare active offers, and keep the
            exchange simple for apartment communities.
          </p>
          <button className="btn-create" onClick={() => setShowModal(true)}>
            + Create New Listing
          </button>
        </div>

        <div className="ml-stats">
          <div className="stat-item">
            <span className="stat-number">{activeCount}</span>
            <span className="stat-label">Active listings</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{totalEnergy.toFixed(1)} kWh</span>
            <span className="stat-label">Total energy</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">₹{avgPrice.toFixed(2)}/kWh</span>
            <span className="stat-label">Average price</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{listings.length}</span>
            <span className="stat-label">Total listings</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="ml-filter-bar">
        <div className="ml-filter-left">
          <p className="ml-label">MY LISTINGS</p>
          <h2 className="ml-section-title">Manage Your Offers</h2>
        </div>
        <div className="ml-filter-controls">
          <input
            className="ml-search"
            placeholder="Search by name or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ml-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All listings</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Listings grid */}
      {loading ? (
        <div className="ml-empty">
          <p>Loading your listings...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="ml-empty">
          <p>
            {listings.length === 0
              ? "You haven't created any listings yet."
              : "No listings match your filter."}
          </p>
          {listings.length === 0 && (
            <button className="btn-create" onClick={() => setShowModal(true)}>
              + Create Your First Listing
            </button>
          )}
        </div>
      ) : (
        <div className="ml-grid">
          {displayed.map((listing) => (
            <div key={listing._id} className="ml-card">
              <div className="ml-card-header">
                <span className={`ml-badge ml-badge--${listing.status}`}>
                  {listing.status === "active" ? "Active" : "Inactive"}
                </span>
                <span className="ml-card-unit">{listing.unit}</span>
              </div>

              <h3 className="ml-card-name">{listing.apartmentName}</h3>
              <p className="ml-card-area">{listing.area}</p>

              <div className="ml-card-stats">
                <div>
                  <span className="ml-card-stat-label">Energy</span>
                  <span className="ml-card-stat-value">
                    {listing.availableEnergy} kWh
                  </span>
                </div>
                <div>
                  <span className="ml-card-stat-label">Price</span>
                  <span className="ml-card-stat-value">
                    ₹{listing.pricePerKwh}/kWh
                  </span>
                </div>
                <div>
                  <span className="ml-card-stat-label">Time</span>
                  <span className="ml-card-stat-value">{listing.timeSlot}</span>
                </div>
              </div>

              <div className="ml-card-actions">
                <button
                  className={`btn-toggle ${listing.status === "active" ? "btn-toggle--deactivate" : "btn-toggle--activate"}`}
                  onClick={() => handleToggleStatus(listing._id, listing.status)}
                >
                  {listing.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteListing(listing._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateListingModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateListing}
        />
      )}
    </div>
  );
};

export default MyListings;
