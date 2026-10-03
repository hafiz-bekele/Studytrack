import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const SECTIONS = [
  {
    label: "Overview",
    links: [
      { to: "/",             label: "Dashboard",       icon: "🏠" },
      { to: "/analytics",    label: "Analytics",       icon: "📊" },
      { to: "/focus-stats",  label: "Focus Stats",     icon: "🔬" },
    ],
  },
  {
    label: "Study",
    links: [
      { to: "/pomodoro",     label: "Pomodoro Timer",  icon: "⏱️" },
      { to: "/study-timer",  label: "Study Timer",     icon: "⏰" },
      { to: "/sessions",     label: "Session History", icon: "📋" },
    ],
  },
  {
    label: "Content",
    links: [
      { to: "/subjects",       label: "Subjects",        icon: "📚" },
      { to: "/tasks",          label: "Tasks",           icon: "✅" },
      { to: "/notes",          label: "Notes",           icon: "📝" },
      { to: "/flashcards",     label: "Flashcards",      icon: "🧠" },
      { to: "/learning-room",  label: "Learning Room",   icon: "🎓" },
      { to: "/resources",      label: "Resource Library",icon: "🔗" },
    ],
  },
  {
    label: "Progress",
    links: [
      { to: "/goals",          label: "Goals",           icon: "🎯" },
      { to: "/planner",        label: "4-Month Planner", icon: "🗓️" },
      { to: "/achievements",   label: "Achievements",    icon: "🏆" },
      { to: "/leaderboard",    label: "Milestones",      icon: "🎖️" },
    ],
  },
  {
    label: "Tools",
    links: [
      { to: "/search",         label: "Search",          icon: "🔍" },
      { to: "/settings",       label: "Settings",        icon: "⚙️" },
    ],
  },
];

export default function Sidebar() {
  // collapsed = desktop sidebar shows icons only
  const [collapsed, setCollapsed] = useState(false);
  // mobileOpen = sidebar slides in on mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Mobile hamburger (only visible on small screens) ── */}
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 140,
          }}
          onClick={closeMobile}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`sidebar ${mobileOpen ? "open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}
        style={{ width: collapsed ? 64 : "var(--sidebar-w)" }}
      >
        {/* Brand / Logo — click to collapse on desktop */}
        <div
          className="sidebar-brand"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            cursor: "pointer",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "8px 0 20px" : "8px 12px 20px",
            userSelect: "none",
          }}
        >
          <div
            className="sidebar-brand-icon"
            style={{ flexShrink: 0, transition: "transform 0.2s" }}
          >
            📖
          </div>

          {/* Label fades out when collapsed */}
          <span
            style={{
              overflow: "hidden",
              whiteSpace: "nowrap",
              maxWidth: collapsed ? 0 : 140,
              opacity: collapsed ? 0 : 1,
              transition: "max-width 0.25s ease, opacity 0.2s ease",
              display: "inline-block",
            }}
          >
            StudyTrack
          </span>

          {/* Collapse arrow */}
          {!collapsed && (
            <span
              style={{
                marginLeft: "auto", fontSize: 12, color: "var(--text-3)",
                transition: "transform 0.2s",
              }}
            >
              ◀
            </span>
          )}
        </div>

        <nav>
          {SECTIONS.map((section) => (
            <div key={section.label}>
              {/* Section label hidden when collapsed */}
              {!collapsed && (
                <div className="sidebar-section">{section.label}</div>
              )}
              {collapsed && (
                <div style={{ height: 8 }} />
              )}

              {section.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    "sidebar-link" + (isActive ? " active" : "")
                  }
                  onClick={closeMobile}
                  end={l.to === "/"}
                  title={collapsed ? l.label : undefined}
                  style={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "9px 0" : "9px 12px",
                  }}
                >
                  <span className="sidebar-icon">{l.icon}</span>

                  {/* Label slides out when collapsed */}
                  <span
                    style={{
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      maxWidth: collapsed ? 0 : 180,
                      opacity: collapsed ? 0 : 1,
                      transition: "max-width 0.25s ease, opacity 0.2s ease",
                      display: "inline-block",
                    }}
                  >
                    {l.label}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Expand hint at bottom when collapsed */}
        {collapsed && (
          <div
            onClick={() => setCollapsed(false)}
            style={{
              marginTop: "auto", padding: "16px 0",
              display: "flex", justifyContent: "center",
              cursor: "pointer", color: "var(--text-3)", fontSize: 18,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--primary-light)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-3)"}
            title="Expand sidebar"
          >
            ▶
          </div>
        )}
      </aside>
    </>
  );
}
