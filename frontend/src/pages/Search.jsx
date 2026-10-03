import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function SearchPage() {
  const [query,      setQuery]      = useState("");
  const [notes,      setNotes]      = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [resources,  setResources]  = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/notes"),
      api.get("/tasks"),
      api.get("/resources"),
      api.get("/flashcards"),
      api.get("/subjects"),
    ])
      .then(([n, t, r, f, s]) => {
        setNotes(n.data);
        setTasks(t.data);
        setResources(r.data);
        setFlashcards(f.data);
        setSubjects(s.data);
      })
      .catch(() => toast.error("Failed to load search data"))
      .finally(() => setLoading(false));
  }, []);

  const q = query.toLowerCase().trim();

  const matchNotes = q
    ? notes.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags || "").toLowerCase().includes(q))
    : [];

  const matchTasks = q
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.tags || "").toLowerCase().includes(q))
    : [];

  const matchResources = q
    ? resources.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        (r.url || "").toLowerCase().includes(q))
    : [];

  const matchFlashcards = q
    ? flashcards.filter((c) =>
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q))
    : [];

  const matchSubjects = q
    ? subjects.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q))
    : [];

  const total =
    matchNotes.length + matchTasks.length + matchResources.length +
    matchFlashcards.length + matchSubjects.length;

  const subjectColor = (id) => subjects.find((s) => s.id === id)?.color || "var(--primary)";
  const subjectName  = (id) => subjects.find((s) => s.id === id)?.name;

  const typeIcons = { video:"🎬", youtube:"▶️", link:"🔗", pdf:"📄",
                      book:"📖", article:"📰", course:"🎓", tool:"🔧" };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">🔍 Search</h1>
        <p className="page-sub">Search across all your notes, tasks, resources and flashcards</p>
      </div>

      <input
        className="search-input"
        autoFocus
        placeholder="Type to search everything…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ fontSize: 16, padding: "12px 20px" }}
      />

      {loading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {q && !loading && (
        <>
          <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 16 }}>
            <strong style={{ color: "var(--text)" }}>{total}</strong> result{total !== 1 ? "s" : ""} for
            "{query}"
          </p>

          {/* ── Subjects ── */}
          {matchSubjects.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h2>📚 Subjects ({matchSubjects.length})</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {matchSubjects.map((s) => (
                  <Link key={s.id} to="/subjects"
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                      background: `${s.color}18`, border: `1px solid ${s.color}44`,
                      borderRadius: "var(--radius-sm)", textDecoration: "none",
                      color: s.color, fontWeight: 600, fontSize: 13,
                      transition: "var(--transition)",
                    }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%",
                                  background: s.color }} />
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {matchNotes.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h2>📝 Notes ({matchNotes.length})</h2>
              {matchNotes.map((n) => (
                <div key={n.id} style={{
                  padding: "10px 0", borderBottom: "1px solid var(--card-border)",
                  cursor: "pointer",
                }} onClick={() => navigate("/notes")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {n.isPinned && <span>📌</span>}
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                    {n.subjectId && (
                      <span style={{
                        fontSize: 10, padding: "1px 7px", borderRadius: 99,
                        background: `${subjectColor(n.subjectId)}22`,
                        color: subjectColor(n.subjectId),
                        border: `1px solid ${subjectColor(n.subjectId)}44`,
                      }}>{subjectName(n.subjectId)}</span>
                    )}
                    {n.tags && <span style={{ fontSize: 10, color: "var(--text-3)" }}>{n.tags}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3, lineHeight: 1.5 }}>
                    {n.content.slice(0, 140)}{n.content.length > 140 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Tasks ── */}
          {matchTasks.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h2>✅ Tasks ({matchTasks.length})</h2>
              {matchTasks.map((t) => {
                const PRIORITY_COLOR = { high:"var(--danger)", medium:"var(--warning)", low:"var(--success)" };
                return (
                  <div key={t.id} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "10px 0",
                    borderBottom: "1px solid var(--card-border)",
                    cursor: "pointer",
                  }} onClick={() => navigate("/tasks")}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {t.status} · {t.priority}
                        {t.dueDate && ` · due ${t.dueDate}`}
                        {t.estimatedHours > 0 && ` · ${t.estimatedHours}h`}
                      </div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: PRIORITY_COLOR[t.priority] || "var(--text-3)",
                      flexShrink: 0,
                    }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Learning Room resources ── */}
          {matchResources.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h2>🎓 Learning Room ({matchResources.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {matchResources.map((r) => {
                  const ytId = extractYouTubeId(r.url);
                  return (
                    <div key={r.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px",
                        background: "var(--bg-3)", border: "1px solid var(--card-border)",
                        borderRadius: "var(--radius-sm)", cursor: "pointer",
                        transition: "var(--transition)",
                      }}
                      onClick={() => navigate("/learning-room")}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--card-border)"}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: 60, height: 40, flexShrink: 0,
                        borderRadius: 6, overflow: "hidden",
                        background: r.thumbnail
                          ? `url(${r.thumbnail}) center/cover no-repeat`
                          : "var(--card)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {!r.thumbnail && <span style={{ fontSize: 20 }}>
                          {typeIcons[r.type] || "🔗"}
                        </span>}
                        {ytId && !r.thumbnail && <span style={{ fontSize: 20 }}>▶️</span>}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14,
                                      whiteSpace: "nowrap", overflow: "hidden",
                                      textOverflow: "ellipsis" }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2,
                                      display: "flex", gap: 8 }}>
                          <span>{typeIcons[r.type] || "🔗"} {r.type}</span>
                          {r.duration && <span>⏱ {r.duration}</span>}
                          {r.watchCount > 0 && <span>👁 {r.watchCount}×</span>}
                          {r.isFavorite && <span>❤️</span>}
                        </div>
                      </div>

                      <span style={{ fontSize: 12, color: "var(--primary-light)",
                                     fontWeight: 600, flexShrink: 0 }}>
                        {ytId ? "▶ Watch" : "↗ Open"} →
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Flashcards ── */}
          {matchFlashcards.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <h2>🧠 Flashcards ({matchFlashcards.length})</h2>
              {matchFlashcards.map((c) => (
                <div key={c.id} style={{
                  padding: "10px 0", borderBottom: "1px solid var(--card-border)",
                  cursor: "pointer",
                }} onClick={() => navigate("/flashcards")}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.question}</div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>
                    {c.answer.slice(0, 100)}{c.answer.length > 100 ? "…" : ""}
                  </p>
                  {c.subjectId && (
                    <span style={{
                      fontSize: 10, color: subjectColor(c.subjectId),
                      marginTop: 3, display: "inline-block",
                    }}>📚 {subjectName(c.subjectId)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {total === 0 && (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--text-3)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No results for "{query}"</div>
              <p style={{ fontSize: 13, marginTop: 8 }}>Try a different search term</p>
            </div>
          )}
        </>
      )}

      {/* Prompt to type */}
      {!q && !loading && (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--text-3)" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Search everything</div>
          <p style={{ fontSize: 13 }}>
            Notes · Tasks · Learning Room · Flashcards · Subjects
          </p>
        </div>
      )}
    </div>
  );
}
