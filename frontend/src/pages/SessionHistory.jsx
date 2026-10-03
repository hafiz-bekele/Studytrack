import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const PAGE_SIZE = 15;

export default function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterSubject, setFilterSubject] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (filterSubject) params.subjectId = filterSubject;
    api.get("/sessions", { params })
      .then((r) => { setSessions(r.data.sessions); setTotal(r.data.total); })
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, [page, filterSubject]);

  useEffect(() => { api.get("/subjects").then((r) => setSubjects(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!confirm("Delete this session?")) return;
    await api.delete(`/sessions/${id}`);
    toast.success("Session deleted");
    load();
  };

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const moodEmoji = { great: "😄", good: "🙂", okay: "😐", tired: "😴", stressed: "😰" };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Session History</h1>
        <p className="page-sub">{total} sessions logged</p>
      </div>

      <div className="card">
        <div className="inline-form" style={{ marginBottom: 16 }}>
          <select
            value={filterSubject}
            onChange={(e) => { setFilterSubject(e.target.value); setPage(0); }}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : sessions.length === 0
            ? <p className="muted">No sessions found.</p>
            : sessions.map((s) => (
              <div className="session-row" key={s.id}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className={`session-type-badge type-${s.type}`}>{s.type}</span>
                    <strong style={{ fontSize: 14 }}>{s.durationMinutes} min</strong>
                    {s.subjectId && (
                      <span className="tag tag-purple">{subjectName(s.subjectId)}</span>
                    )}
                    {s.mood && <span title={s.mood}>{moodEmoji[s.mood] || s.mood}</span>}
                  </div>
                  {s.notes && <p className="muted small" style={{ marginTop: 4 }}>{s.notes}</p>}
                  <div className="muted small" style={{ marginTop: 2 }}>
                    {format(new Date(s.date), "PPpp")}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Delete</button>
              </div>
            ))
        }

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span style={{ alignSelf: "center", color: "var(--text-2)", fontSize: 13 }}>
              Page {page + 1} of {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="card">
        <h2>Export Data</h2>
        <p className="muted" style={{ marginBottom: 12 }}>Download your complete session log as a CSV file.</p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            const res = await api.get("/progress/export.csv", { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url; a.download = "study_sessions.csv";
            a.click(); URL.revokeObjectURL(url);
          }}
        >
          📥 Export CSV
        </button>
      </div>
    </div>
  );
}
