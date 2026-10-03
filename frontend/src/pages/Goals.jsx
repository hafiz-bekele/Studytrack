import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import ProgressBar from "../components/ProgressBar.jsx";
import toast from "react-hot-toast";

const TYPE_META = {
  weekly:  { label: "This Week",  icon: "📅", color: "var(--success)" },
  monthly: { label: "This Month", icon: "📆", color: "var(--primary)" },
  total:   { label: "All-time",   icon: "🏆", color: "var(--warning)" },
};

export default function Goals() {
  const [goals,    setGoals]    = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [form,     setForm]     = useState({ type: "weekly", subjectId: "", targetHours: 5 });
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    try {
      const [goalsRes, subjectsRes, summaryRes] = await Promise.all([
        api.get("/goals"), api.get("/subjects"), api.get("/progress/summary"),
      ]);
      setGoals(goalsRes.data);
      setSubjects(subjectsRes.data);
      setSummary(summaryRes.data);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/goals", form);
      toast.success("Goal added ✓");
      setForm({ type: "weekly", subjectId: "", targetHours: 5 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add goal");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this goal?")) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success("Goal removed");
      load();
    } catch { toast.error("Failed to delete goal"); }
  };

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name;

  const hoursFor = (goal) => {
    if (!summary) return 0;
    if (goal.subjectId) {
      const subj = summary.perSubject?.find((s) => s.subjectId === goal.subjectId);
      return subj?.hours ?? 0;
    }
    if (goal.type === "weekly")  return summary.weekHours  ?? 0;
    if (goal.type === "monthly") return summary.monthHours ?? 0;
    return summary.totalHours ?? 0;
  };

  const progressFor = (goal) => {
    const h = hoursFor(goal);
    return Math.min(100, goal.targetHours > 0 ? (100 * h) / goal.targetHours : 0);
  };

  if (loading) return (
    <div className="loading-center animate-in">
      <div className="spinner" /><span>Loading goals…</span>
    </div>
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">🎯 Goals</h1>
        <p className="page-sub">Set study-hour targets and track your progress</p>
      </div>

      {/* ── Add form ── */}
      <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14 }}>New Goal</h2>
        <div className="inline-form">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="weekly">📅 Weekly</option>
            <option value="monthly">📆 Monthly</option>
            <option value="total">🏆 All-time</option>
          </select>
          <select value={form.subjectId}
            onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">Overall (all subjects)</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="number" min="1" max="1000" style={{ width: 90, flex: "0 0 auto" }}
            value={form.targetHours}
            onChange={(e) => setForm({ ...form, targetHours: Number(e.target.value) })} />
          <span style={{ alignSelf: "center", color: "var(--text-2)", fontSize: 13 }}>target hours</span>
          <button className="btn btn-primary" type="submit">Add Goal</button>
        </div>
      </form>

      {/* ── Goals grid ── */}
      {goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px",
                      border: "2px dashed var(--card-border)", borderRadius: "var(--radius)",
                      color: "var(--text-3)" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No goals yet</div>
          <p style={{ fontSize: 14 }}>Set your first study-hour target above</p>
        </div>
      ) : (
        <div className="card-grid">
          {goals.map((g) => {
            const pct     = progressFor(g);
            const current = hoursFor(g);
            const tm      = TYPE_META[g.type] || TYPE_META.weekly;
            const done    = pct >= 100;

            return (
              <div key={g.id} style={{
                background: "var(--card)", border: "1px solid var(--card-border)",
                borderTop: `3px solid ${tm.color}`,
                borderRadius: "var(--radius)", padding: 18,
                transition: "var(--transition)",
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = ""}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between",
                              alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 18 }}>{tm.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{tm.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {subjectName(g.subjectId) || "Overall"}
                    </div>
                  </div>

                  {/* % badge */}
                  <div style={{
                    fontSize: 22, fontWeight: 900, letterSpacing: "-1px",
                    color: done ? "var(--success)" : tm.color,
                  }}>{Math.round(pct)}%</div>
                </div>

                {/* Progress bar */}
                <ProgressBar pct={pct} color={tm.color} />

                <div style={{ display: "flex", justifyContent: "space-between",
                              fontSize: 12, color: "var(--text-2)", margin: "8px 0 12px" }}>
                  <span>{current}h logged</span>
                  <span>{g.targetHours}h target</span>
                </div>

                {done && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(6,214,160,0.12)", color: "var(--success)",
                    border: "1px solid rgba(6,214,160,0.25)", borderRadius: 99,
                    padding: "3px 10px", fontSize: 11, fontWeight: 700, marginBottom: 10,
                  }}>🎉 Goal reached!</div>
                )}

                <button className="btn btn-danger btn-sm" onClick={() => remove(g.id)}>
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
