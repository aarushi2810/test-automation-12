import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ShareEnergy from "./pages/ShareEnergy";
import Register from "./pages/Register";
import Login from "./pages/Login";

import "./App.css";

function ProtectedRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function PublicAuthRoute({ isLoggedIn, children }) {
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("user"));

  useEffect(() => {
    const handleStorage = () => {
      setIsLoggedIn(!!localStorage.getItem("user"));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

        <main className="main-content">
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/share-energy"
                element={
                  <ProtectedRoute isLoggedIn={isLoggedIn}>
                    <ShareEnergy />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicAuthRoute isLoggedIn={isLoggedIn}>
                    <Login setIsLoggedIn={setIsLoggedIn} />
                  </PublicAuthRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicAuthRoute isLoggedIn={isLoggedIn}>
                    <Register />
                  </PublicAuthRoute>
                }
              />
              <Route
                path="/predict"
                element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
              />
              <Route
                path="/contact"
                element={<Navigate to={isLoggedIn ? "/share-energy" : "/login"} replace />}
              />
              <Route
                path="/about"
                element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
              />
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
