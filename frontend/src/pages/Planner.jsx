import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import toast from "react-hot-toast";

const PHASE_STYLE = {
  "Foundation":     { bg: "#1e3a5f", border: "#2563eb", badge: "#3b82f6" },
  "Deep Practice":  { bg: "#3b2a0f", border: "#d97706", badge: "#f59e0b" },
  "Mock & Review":  { bg: "#3b0f1a", border: "#dc2626", badge: "#ef4444" },
  "Final Revision": { bg: "#0f3b1a", border: "#16a34a", badge: "#22c55e" },
};

export default function Planner() {
  const [plan,       setPlan]       = useState(null);
  const [subjects,   setSubjects]   = useState([]);
  const [sessions,   setSessions]   = useState([]); // flat array after fix
  const [startDate,  setStartDate]  = useState(new Date().toISOString().slice(0, 10));
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  /* ── load ──────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, subjectsRes, sessionsRes] = await Promise.all([
        api.get("/plan"),
        api.get("/subjects"),
        api.get("/sessions", { params: { limit: 9999 } }), // paginated endpoint
      ]);

      setPlan(planRes.data);
      setSubjects(subjectsRes.data);
      // sessions endpoint returns { sessions: [...], total: N }
      setSessions(sessionsRes.data?.sessions ?? sessionsRes.data ?? []);
    } catch (err) {
      toast.error("Failed to load planner");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── generate ──────────────────────────────────────────────────────────── */
  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post("/plan/generate", { startDate });
      setPlan(data);
      toast.success("Plan generated! 🗓");
    } catch {
      toast.error("Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  /* ── helpers ───────────────────────────────────────────────────────────── */
  const subjectName  = (id) => subjects.find((s) => s.id === id)?.name  || "Unknown";
  const subjectColor = (id) => subjects.find((s) => s.id === id)?.color || "#6c63ff";

  const completedHoursForWeek = (weekStartStr, weekEndStr) => {
    const ws = new Date(weekStartStr);
    const we = new Date(weekEndStr);
    we.setHours(23, 59, 59, 999);
    const mins = sessions
      .filter((s) => {
        const d = new Date(s.date);
        return d >= ws && d <= we;
      })
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return Math.round((mins / 60) * 10) / 10;
  };

  // The DB returns snake_case; guard both shapes
  const planStart = plan?.startDate || plan?.start_date || "";
  const planEnd   = plan?.endDate   || plan?.end_date   || "";
  const planWeeks = plan?.weeks     || [];

  /* ── today marker ──────────────────────────────────────────────────────── */
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentWeekIdx = planWeeks.findIndex(
    (w) => todayStr >= w.startDate && todayStr <= w.endDate
  );

  /* ── loading / empty states ────────────────────────────────────────────── */
  if (loading) return (
    <div className="loading-center animate-in">
      <div className="spinner" />
      <span>Loading planner…</span>
    </div>
  );

  return (
    <div className="animate-in">
      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="page-title">🗓 4-Month Study Planner</h1>
        <p className="page-sub">
          16-week plan · Foundation → Deep Practice → Mock &amp; Review → Final Revision
        </p>
      </div>

      {/* ── Generate card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Plan start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={generating}
            style={{ whiteSpace: "nowrap" }}
          >
            {generating ? "Generating…" : plan ? "🔄 Regenerate Plan" : "✨ Generate 4-Month Plan"}
          </button>
        </div>
        {subjects.length === 0 && (
          <div className="alert alert-warning" style={{ marginTop: 14, marginBottom: 0 }}>
            ⚠ Add subjects first so the planner can assign focus topics per week.
          </div>
        )}
      </div>

      {/* ── No plan yet ── */}
      {!plan && (
        <div style={{
          textAlign: "center", padding: "64px 24px",
          border: "2px dashed var(--card-border)", borderRadius: "var(--radius)",
          color: "var(--text-3)",
        }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🗓</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No plan yet</div>
          <p style={{ fontSize: 14 }}>
            Pick a start date and click <strong>Generate 4-Month Plan</strong>
          </p>
        </div>
      )}

      {/* ── Plan exists ── */}
      {plan && (
        <>
          {/* Summary banner */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap",
          }}>
            {[
              { icon: "▶", label: "Start",    value: planStart },
              { icon: "⏹", label: "End",      value: planEnd   },
              { icon: "📆", label: "Weeks",   value: planWeeks.length },
              { icon: "📚", label: "Subjects", value: subjects.length  },
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--card)", border: "1px solid var(--card-border)",
                borderRadius: "var(--radius)", padding: "12px 18px",
                display: "flex", alignItems: "center", gap: 10, flex: "1 1 140px",
              }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase",
                                letterSpacing: "0.5px" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Phase legend */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {Object.entries(PHASE_STYLE).map(([name, s]) => (
              <div key={name} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                color: s.badge,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%",
                               background: s.badge, display: "inline-block" }} />
                {name}
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="week-grid">
            {planWeeks.map((w, idx) => {
              const ps        = PHASE_STYLE[w.phase] || PHASE_STYLE["Foundation"];
              const done      = completedHoursForWeek(w.startDate, w.endDate);
              const target    = w.targetHours || 10;
              const pct       = Math.min(100, Math.round((done / target) * 100));
              const isCurrent = idx === currentWeekIdx;
              const isPast    = w.endDate < todayStr;

              return (
                <div
                  key={w.weekNumber}
                  style={{
                    background: ps.bg,
                    border: `2px solid ${isCurrent ? "#fff" : ps.border}`,
                    borderRadius: "var(--radius)",
                    padding: 14,
                    position: "relative",
                    transition: "var(--transition)",
                    opacity: isPast && !isCurrent ? 0.75 : 1,
                    boxShadow: isCurrent ? "0 0 0 3px rgba(255,255,255,0.2)" : "none",
                  }}
                >
                  {/* Current week badge */}
                  {isCurrent && (
                    <div style={{
                      position: "absolute", top: -10, right: 10,
                      background: "#6c63ff", color: "#fff",
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.5px",
                      padding: "2px 8px", borderRadius: 99,
                      textTransform: "uppercase",
                    }}>
                      This week
                    </div>
                  )}

                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between",
                                alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>
                      Week {w.weekNumber}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                      {w.startDate}
                    </span>
                  </div>

                  {/* Phase badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: `${ps.badge}22`, border: `1px solid ${ps.badge}66`,
                    color: ps.badge, borderRadius: 99,
                    padding: "2px 9px", fontSize: 10, fontWeight: 700,
                    marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>
                    {w.phase}
                  </div>

                  {/* Focus subjects */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {w.focusSubjectIds.length === 0 ? (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        No subjects
                      </span>
                    ) : (
                      w.focusSubjectIds.map((id) => (
                        <span key={id} style={{
                          padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                          border: `1.5px solid ${subjectColor(id)}`,
                          background: `${subjectColor(id)}22`,
                          color: subjectColor(id),
                        }}>
                          {subjectName(id)}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Hours progress */}
                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                      <span>{done}h logged</span>
                      <span>{target}h goal{pct >= 100 ? " ✅" : ""}</span>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 999,
                                  height: 6, overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%", borderRadius: 999,
                        background: pct >= 100 ? "#22c55e" : pct > 60 ? "#f59e0b" : "#6c63ff",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
