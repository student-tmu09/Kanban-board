import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Layout({ children, title, right }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    // If your backend has a logout API, call it here.
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">KANBAN<span>.</span></div>
        <nav>
          <Link className={location.pathname === "/dashboard" ? "active" : ""} to="/dashboard">Dashboard</Link>
          <Link className={location.pathname === "/notifications" ? "active" : ""} to="/notifications">Notifications</Link>
        </nav>
        <button className="logout" onClick={logout}>Logout</button>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
          </div>
          <div>{right}</div>
        </header>
        {children}
      </main>
    </div>
  );
}