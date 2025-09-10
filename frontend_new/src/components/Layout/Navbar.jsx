import React from "react";

export default function Navbar({ onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="app-title">echo.</h1>
      </div>
      <div className="navbar-right">
        
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
