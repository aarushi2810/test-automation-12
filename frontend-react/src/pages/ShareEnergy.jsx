import { useState, useEffect } from "react";
import MyListings from "../components/MyListings";
import "./ShareEnergy.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

// ── Badge config for marketplace cards ───────────────────────────
const BADGE_CONFIG = {
  "High surplus": { bg: "#2a3a1a", color: "#86efac" },
  "Nearby":       { bg: "#1a2a3a", color: "#93c5fd" },
  "Best rate":    { bg: "#2a1a3a", color: "#d8b4fe" },
  "Fast approval":{ bg: "#3a2a1a", color: "#fcd34d" },
};

const getBadge = (index) => {
  const badges = Object.keys(BADGE_CONFIG);
  return badges[index % badges.length];
};

// ── Main Component ────────────────────────────────────────────────
const ShareEnergy = () => {
  const [activeTab, setActiveTab] = useState("browse");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("nearest");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (activeTab === "browse") fetchListings();
  }, [activeTab]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/listings`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEnergy = (listing) => {
    alert(`Energy request sent to ${listing.apartmentName}!\nWe'll notify you once confirmed.`);
    // TODO: wire up to your request/booking endpoint
  };

  // Sort logic
  const sorted = [...listings].sort((a, b) => {
    if (sort === "price_asc")  return a.pricePerKwh - b.pricePerKwh;
    if (sort === "price_desc") return b.pricePerKwh - a.pricePerKwh;
    if (sort === "energy")     return b.availableEnergy - a.availableEnergy;
    return 0; // "nearest" – keep server order
  });

  return (
    <div className="share-energy-page">

      {/* ── Tab Switcher ── */}
      <div className="share-tabs-wrapper">
        <div className="share-tabs">
          <button
            className={`share-tab ${activeTab === "browse" ? "share-tab--active" : ""}`}
            onClick={() => setActiveTab("browse")}
          >
            Browse Offers
          </button>
          <button
            className={`share-tab ${activeTab === "my-listings" ? "share-tab--active" : ""}`}
            onClick={() => setActiveTab("my-listings")}
          >
            My Listings
          </button>
        </div>
      </div>

      {/* ── Browse Tab ── */}
      {activeTab === "browse" && (
        <div className="browse-section">
          <div className="browse-header">
            <div className="browse-header-left">
              <p className="browse-label">SHARE ENERGY MARKETPLACE</p>
              <h1 className="browse-title">
                Discover nearby<br />surplus solar energy offers.
              </h1>
              <p className="browse-subtitle">
                Browse local apartment communities, compare rates, and request
                access to available solar energy capacity.
              </p>
            </div>

            <div className="browse-controls">
              <div className="browse-control-group">
                <label>SORT</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="nearest">Nearest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="energy">Most Energy</option>
                </select>
              </div>
              <div className="browse-control-group">
                <label>FILTER</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All listings</option>
                  <option value="active">Active only</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="browse-loading">
              <div className="ml-spinner" />
              <p>Finding nearby offers...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="browse-empty">
              <p>No energy listings available right now.</p>
            </div>
          ) : (
            <div className="browse-grid">
              {sorted.map((listing, index) => {
                const badge = getBadge(index);
                const style = BADGE_CONFIG[badge];
                return (
                  <div key={listing._id} className="browse-card">
                    <div className="browse-card-top">
                      <span
                        className="browse-badge"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {badge}
                      </span>
                    </div>

                    <h3 className="browse-card-name">{listing.apartmentName}</h3>
                    <p className="browse-card-area">{listing.area}</p>

                    <div className="browse-card-stats">
                      <div>
                        <span className="browse-stat-label">Energy</span>
                        <span className="browse-stat-value">
                          {listing.availableEnergy} kWh
                        </span>
                      </div>
                      <div>
                        <span className="browse-stat-label">Price</span>
                        <span className="browse-stat-value">
                          ₹{listing.pricePerKwh}/kWh
                        </span>
                      </div>
                      <div>
                        <span className="browse-stat-label">Time</span>
                        <span className="browse-stat-value">
                          {listing.timeSlot}
                        </span>
                      </div>
                    </div>

                    <button
                      className="btn-request"
                      onClick={() => handleRequestEnergy(listing)}
                    >
                      Request energy
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── My Listings Tab ── */}
      {activeTab === "my-listings" && <MyListings />}
    </div>
  );
};

export default ShareEnergy;
