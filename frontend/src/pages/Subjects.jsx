import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import ProgressBar from "../components/ProgressBar.jsx";
import toast from "react-hot-toast";

const COLORS = [
  "#6c63ff", "#059669", "#dc2626", "#d97706",
  "#0891b2", "#9333ea", "#be185d", "#0f766e",
  "#b45309", "#1d4ed8", "#7c3aed", "#db2777",
];

const EMPTY_FORM = {
  name: "", color: COLORS[0],
  totalTopics: 10, completedTopics: 0,
  description: "",
};

export default function Subjects() {
  const [subjects,  setSubjects]  = useState([]);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);

  /* ── load ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const r = await api.get("/subjects");
      setSubjects(r.data);
    } catch {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── submit ───────────────────────────────────────────────────────────── */
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Subject name is required"); return; }

    const payload = {
      name:            form.name.trim(),
      color:           form.color,
      totalTopics:     Number(form.totalTopics)     || 0,
      completedTopics: Number(form.completedTopics) || 0,
      description:     form.description || "",
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/subjects/${editingId}`, payload);
        toast.success("Subject updated ✓");
      } else {
        await api.post("/subjects", payload);
        toast.success("Subject added ✓");
      }
      closeForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name:            s.name,
      color:           s.color || COLORS[0],
      totalTopics:     s.totalTopics     || 0,
      completedTopics: s.completedTopics || 0,
      description:     s.description    || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const remove = async (id, name) => {
    if (!confirm(`Delete subject "${name}"? This will also unlink its tasks, notes and sessions.`)) return;
    try {
      await api.delete(`/subjects/${id}`);
      toast.success("Subject deleted");
      load();
    } catch {
      toast.error("Failed to delete subject");
    }
  };

  /* ── totals ───────────────────────────────────────────────────────────── */
  const totalTopics     = subjects.reduce((s, x) => s + (x.totalTopics     || 0), 0);
  const completedTopics = subjects.reduce((s, x) => s + (x.completedTopics || 0), 0);
  const overallPct      = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

  /* ── loading ──────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="loading-center animate-in">
      <div className="spinner" />
      <span>Loading subjects…</span>
    </div>
  );

  return (
    <div className="animate-in">
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">📚 Subjects</h1>
          <p className="page-sub">Manage your courses and track topic completion</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          ✚ Add Subject
        </button>
      </div>

      {/* ── Overall progress banner ── */}
      {subjects.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Overall Curriculum Progress</span>
            <span style={{ fontWeight: 800, fontSize: 18,
                           color: overallPct === 100 ? "var(--success)" : "var(--primary-light)" }}>
              {overallPct}%
            </span>
          </div>
          <ProgressBar pct={overallPct} />
          <div style={{ display: "flex", justifyContent: "space-between",
                        fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
            <span>{completedTopics} topics completed</span>
            <span>{totalTopics} total topics across {subjects.length} subject{subjects.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
          zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }} onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div style={{
            background: "var(--bg-2)", border: "1px solid var(--card-border)",
            borderRadius: "var(--radius-lg)", padding: 28,
            width: "100%", maxWidth: 500,
            boxShadow: "var(--shadow-lg)", animation: "scaleIn 0.2s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                {editingId ? "✏ Edit Subject" : "✚ New Subject"}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕ Close</button>
            </div>

            <form onSubmit={submit}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Subject name *</label>
                <input
                  placeholder="e.g. Mathematics, Physics, History…"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required autoFocus
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief notes about this subject…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Color swatches */}
              <div className="form-group">
                <label className="form-label">Colour</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: c, border: "none", cursor: "pointer",
                        outline: form.color === c ? `3px solid white` : "none",
                        outlineOffset: 2,
                        boxShadow: form.color === c ? `0 0 0 5px ${c}55` : "none",
                        transition: "all 0.15s",
                        transform: form.color === c ? "scale(1.2)" : "scale(1)",
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Total topics</label>
                  <input
                    type="number" min="0"
                    value={form.totalTopics}
                    onChange={(e) => setForm({ ...form, totalTopics: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Completed topics</label>
                  <input
                    type="number" min="0"
                    max={form.totalTopics || 9999}
                    value={form.completedTopics}
                    onChange={(e) => setForm({ ...form, completedTopics: e.target.value })}
                  />
                </div>
              </div>

              {/* Preview */}
              <div style={{
                background: `${form.color}18`,
                border: `1px solid ${form.color}44`,
                borderLeft: `4px solid ${form.color}`,
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px", marginBottom: 16,
                fontSize: 13, fontWeight: 600, color: form.color,
              }}>
                Preview: {form.name || "Subject name"}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Update Subject" : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Subject cards ── */}
      {subjects.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 24px",
          border: "2px dashed var(--card-border)", borderRadius: "var(--radius)",
          color: "var(--text-3)",
        }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>📚</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No subjects yet</div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>
            Add your first subject to start tracking topics and study time
          </p>
          <button className="btn btn-primary" onClick={openAdd}>✚ Add your first subject</button>
        </div>
      ) : (
        <div className="card-grid">
          {subjects.map((s) => {
            const pct = s.totalTopics
              ? Math.round((100 * (s.completedTopics || 0)) / s.totalTopics)
              : 0;
            return (
              <div key={s.id} style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                borderTop: `4px solid ${s.color}`,
                borderRadius: "var(--radius)",
                padding: 18,
                transition: "var(--transition)",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                {/* Subject name + color dot */}
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: s.color, flexShrink: 0,
                    boxShadow: `0 0 8px ${s.color}88`,
                  }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{s.name}</h3>
                </div>

                {/* Description */}
                {s.description && (
                  <p style={{ fontSize: 12, color: "var(--text-2)",
                               marginBottom: 10, lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                )}

                {/* Progress */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                fontSize: 12, color: "var(--text-2)", marginBottom: 5 }}>
                    <span>{s.completedTopics || 0} / {s.totalTopics || 0} topics</span>
                    <span style={{
                      fontWeight: 700,
                      color: pct === 100 ? "var(--success)" : s.color,
                    }}>{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} color={s.color} />
                </div>

                {/* Completion badge */}
                {pct === 100 && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(6,214,160,0.12)", color: "var(--success)",
                    border: "1px solid rgba(6,214,160,0.25)", borderRadius: 99,
                    padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    marginBottom: 10,
                  }}>
                    ✅ Complete
                  </div>
                )}

                {/* Actions */}
                <div className="row-actions" style={{ marginTop: 10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                    ✏ Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(s.id, s.name)}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
