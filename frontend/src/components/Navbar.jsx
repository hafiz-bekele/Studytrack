import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useNavigate, Link } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="navbar">
      <div className="navbar-left">
        {/* breadcrumb placeholder / greeting */}
        <span style={{ color: "var(--text-2)", fontSize: 13 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="navbar-right">
        {/* Theme toggle */}
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Search shortcut */}
        <Link to="/search" className="icon-btn" title="Search" aria-label="Search">
          🔍
        </Link>

        {/* User pill */}
        <div className="navbar-user-pill" onClick={() => navigate("/settings")}>
          <div className="user-avatar">{initials}</div>
          <span className="navbar-username">{user?.username}</span>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { logout(); navigate("/"); }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
