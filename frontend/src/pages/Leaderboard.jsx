import React, { useEffect, useState } from "react";
import api from "../api";
import ProgressBar from "../components/ProgressBar.jsx";
import toast from "react-hot-toast";

export default function Leaderboard() {
  const [milestones, setMilestones] = useState(null);
  const [pomStats, setPomStats]     = useState(null);
  const [taskStats, setTaskStats]   = useState(null);
  const [noteStats, setNoteStats]   = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/stats/milestones"),
      api.get("/stats/pomodoro"),
      api.get("/stats/tasks"),
      api.get("/stats/notes"),
      api.get("/achievements"),
    ])
      .then(([m, p, t, n, a]) => {
        setMilestones(m.data);
        setPomStats(p.data);
        setTaskStats(t.data);
        setNoteStats(n.data);
        setAchievements(a.data);
      })
      .catch(() => toast.error("Failed to load milestones"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center"><div className="spinner" /><span>Loading milestones…</span></div>
  );

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  const MILESTONE_CARDS = milestones ? [
    {
      icon: "⏰",
      label: "Study Hours",
      current: `${milestones.hours.current}h`,
      next: milestones.hours.next ? `Next: ${milestones.hours.next}h` : "🎉 All milestones hit!",
      pct: milestones.hours.pct,
      color: "var(--primary)",
    },
    {
      icon: "🔥",
      label: "Day Streak",
      current: `${milestones.streak.current} days`,
      next: milestones.streak.next ? `Next: ${milestones.streak.next} days` : "🎉 All milestones hit!",
      pct: milestones.streak.pct,
      color: "var(--warning)",
    },
    {
      icon: "📋",
      label: "Sessions Logged",
      current: `${milestones.sessions.current}`,
      next: milestones.sessions.next ? `Next: ${milestones.sessions.next}` : "🎉 All milestones hit!",
      pct: milestones.sessions.pct,
      color: "var(--success)",
    },
  ] : [];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">🎖️ Milestones & Stats</h1>
        <p className="page-sub">Your personal progress tracker — keep pushing!</p>
      </div>

      {/* Milestone progress rings */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {MILESTONE_CARDS.map((m) => (
          <div
            key={m.label}
            className="card"
            style={{
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(108,99,255,0.07), rgba(255,107,157,0.05))",
              border: "1px solid rgba(108,99,255,0.2)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: m.color, letterSpacing: "-1px" }}>
              {m.current}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: "0.5px", margin: "6px 0 12px" }}>
              {m.label}
            </div>
            <ProgressBar pct={m.pct} color={m.color} />
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.next}</div>
          </div>
        ))}
      </div>

      {/* Stats summary row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {pomStats && (
          <div className="card">
            <h2>⏱️ Pomodoro Stats</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Total sessions",   value: pomStats.total },
                { label: "Total focus hours", value: `${pomStats.totalHours}h` },
                { label: "Today's sessions", value: pomStats.todayCount },
                { label: "Best day",         value: pomStats.bestDay ? `${pomStats.bestDay.count} sessions` : "—" },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "var(--card)", border: "1px solid var(--card-border)",
                  borderRadius: "var(--radius-sm)", padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary-light)" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {taskStats && noteStats && (
          <div className="card">
            <h2>📊 Activity Summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Task completion", value: `${taskStats.completionRate}%` },
                { label: "Tasks overdue",   value: taskStats.overdue,  warn: taskStats.overdue > 0 },
                { label: "Notes written",   value: noteStats.total },
                { label: "Words written",   value: noteStats.wordCount.toLocaleString() },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "var(--card)", border: "1px solid var(--card-border)",
                  borderRadius: "var(--radius-sm)", padding: "12px 14px",
                }}>
                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: s.warn ? "var(--danger)" : "var(--primary-light)",
                  }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Task breakdown mini bar */}
            {taskStats.total > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>
                  Task breakdown: {taskStats.done} done · {taskStats.inProgress} in progress · {taskStats.todo} todo
                </div>
                <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2 }}>
                  {[
                    { val: taskStats.done,       color: "var(--success)" },
                    { val: taskStats.inProgress, color: "var(--warning)" },
                    { val: taskStats.todo,       color: "var(--text-3)" },
                  ].map((b, i) => (
                    b.val > 0 && <div key={i} style={{
                      flex: b.val, background: b.color, borderRadius: 999,
                      transition: "flex 0.5s ease",
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="card">
        <h2>🏆 Badges ({earned.length}/{achievements.length})</h2>
        {earned.length > 0 && (
          <>
            <p className="muted small" style={{ marginBottom: 12 }}>Earned</p>
            <div className="card-grid" style={{ marginBottom: 20 }}>
              {earned.map((b) => (
                <div key={b.code} className="badge-card earned card">
                  <span className="badge-icon">🏆</span>
                  <h3>{b.label}</h3>
                  <p className="muted small">{b.desc}</p>
                  <p className="muted small" style={{ marginTop: 4 }}>
                    {new Date(b.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {locked.length > 0 && (
          <>
            <p className="muted small" style={{ marginBottom: 12 }}>Locked</p>
            <div className="card-grid">
              {locked.map((b) => (
                <div key={b.code} className="badge-card locked card">
                  <span className="badge-icon">🔒</span>
                  <h3>{b.label}</h3>
                  <p className="muted small">{b.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {earned.length === achievements.length && achievements.length > 0 && (
          <div className="alert alert-success">🎉 You've earned every badge! Legend status achieved.</div>
        )}
      </div>
    </div>
  );
}
