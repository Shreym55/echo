import React from "react";

export default function Navbar({onAddRoom, onLogout }) {
  return (
    <nav className="navbar">
      
      <div className="navbar-left">
        <h1 className="app-title">echo.</h1>
      </div>

      <div className="navbar-right">
        
        <button className="newroom-btn" onClick={onAddRoom}>
          + New Room
        </button>
        
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
