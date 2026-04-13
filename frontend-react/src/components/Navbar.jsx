import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <header className="site-header">
      <div className="nav-container">
        <Link to="/" className="brand">
          <div className="brand-mark">E</div>
          <div className="brand-copy">
            <span className="brand-title">EcoCharge</span>
            <span className="brand-subtitle">Energy intelligence</span>
          </div>
        </Link>

        <nav className="main-nav">
          <NavLink to="/" className="nav-link">
            Home
          </NavLink>
          {isLoggedIn ? (
            <>
              <NavLink to="/dashboard" className="nav-link">
                Dashboard
              </NavLink>
              <NavLink to="/share-energy" className="nav-link">
                Share Energy
              </NavLink>
              <button type="button" className="nav-link logout-btn nav-link-accent" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="nav-link nav-link-accent">
              Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
