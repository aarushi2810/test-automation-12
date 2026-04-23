import React, { useMemo, useState } from "react";
import "../styles/page.css";
import MyListings from "../components/MyListings";

const energyListings = [
  { id: 1, apartment: "Skyline Residency", energy: 18, price: 7.2, distance: 1.4, badge: "High surplus" },
  { id: 2, apartment: "Sunview Towers",    energy: 12, price: 6.8, distance: 2.1, badge: "Best rate"    },
  { id: 3, apartment: "Green Nest Society",energy: 24, price: 8.1, distance: 3.8, badge: "Fast approval"},
  { id: 4, apartment: "Aurora Heights",    energy: 15, price: 7.6, distance: 1.9, badge: "Nearby"       },
];

export default function ShareEnergy() {
  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "my-listings"
  const [sortBy,    setSortBy]    = useState("distance");
  const [filterBy,  setFilterBy]  = useState("all");

  const listings = useMemo(() => {
    let next = [...energyListings];
    if (filterBy === "high")   next = next.filter((i) => i.energy >= 18);
    if (filterBy === "budget") next = next.filter((i) => i.price  <= 7.2);
    if (sortBy === "price")    next.sort((a, b) => a.price    - b.price);
    if (sortBy === "energy")   next.sort((a, b) => b.energy   - a.energy);
    if (sortBy === "distance") next.sort((a, b) => a.distance - b.distance);
    return next;
  }, [filterBy, sortBy]);

  return (
    <div className="page-share-energy">

      {/* ── Tab switcher ── */}
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

      {/* ── Browse tab (existing UI) ── */}
      {activeTab === "browse" && (
        <>
          <section className="share-energy-head">
            <div>
              <p className="dashboard-eyebrow">Share energy marketplace</p>
              <h1>Discover nearby surplus solar energy offers.</h1>
              <p>
                Browse local apartment communities, compare rates, and request
                access to available solar energy capacity.
              </p>
            </div>
            <div className="share-energy-filters dashboard-card">
              <label>
                <span>Sort</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="distance">Nearest</option>
                  <option value="price">Lowest price</option>
                  <option value="energy">Most energy</option>
                </select>
              </label>
              <label>
                <span>Filter</span>
                <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
                  <option value="all">All listings</option>
                  <option value="high">18+ kWh available</option>
                  <option value="budget">Budget friendly</option>
                </select>
              </label>
            </div>
          </section>

          <section className="share-energy-grid">
            {listings.map((item) => (
              <article key={item.id} className="dashboard-card energy-market-card">
                <div className="energy-market-top">
                  <span className="energy-badge">{item.badge}</span>
                  <span className="energy-distance">{item.distance} km away</span>
                </div>
                <h2>{item.apartment}</h2>
                <div className="energy-market-metrics">
                  <div>
                    <span>Energy</span>
                    <strong>{item.energy} kWh</strong>
                  </div>
                  <div>
                    <span>Price</span>
                    <strong>₹{item.price}/kWh</strong>
                  </div>
                </div>
                <button type="button" className="energy-button">
                  Request energy
                </button>
              </article>
            ))}
          </section>
        </>
      )}

      {/* ── My Listings tab (new) ── */}
      {activeTab === "my-listings" && <MyListings />}

    </div>
  );
}
