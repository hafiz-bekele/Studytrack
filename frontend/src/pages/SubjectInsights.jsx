import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import ProgressBar from "../components/ProgressBar.jsx";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function SubjectInsights() {
  const [subjects,     setSubjects]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [insights,     setInsights]     = useState(null);
  const [subResources, setSubResources] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingSubs,  setLoadingSubs]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/subjects")
      .then((r) => {
        setSubjects(r.data);
        if (r.data.length > 0) setSelected(r.data[0].id);
      })
      .catch(() => toast.error("Failed to load subjects"))
      .finally(() => setLoadingSubs(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      api.get(`/stats/subject/${selected}`),
      api.get("/resources", { params: { subjectId: selected } }),
    ])
      .then(([insightsRes, resRes]) => {
        setInsights(insightsRes.data);
        setSubResources(resRes.data);
      })
      .catch(() => toast.error("Failed to load subject insights"))
      .finally(() => setLoading(false));
  }, [selected]);

  if (loadingSubs) return (
    <div className="loading-center"><div className="spinner" /><span>Loading subjects…</span></div>
  );

  if (subjects.length === 0) return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Subject Insights</h1>
      </div>
      <div className="card">
        <p className="muted">
          No subjects yet. <button className="btn btn-primary btn-sm" onClick={() => navigate("/subjects")}>Add a subject →</button>
        </p>
      </div>
    </div>
  );

  const sub = subjects.find((s) => s.id === selected);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Subject Insights</h1>
        <p className="page-sub">Deep dive into one subject at a time</p>
      </div>

      {/* Subject selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${selected === s.id ? s.color : "var(--card-border)"}`,
                background: selected === s.id ? `${s.color}22` : "var(--card)",
                color: selected === s.id ? s.color : "var(--text-2)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                transition: "var(--transition)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%",
                             background: s.color, display: "inline-block" }} />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {!loading && insights && (
        <>
          {/* Overview row */}
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[
              { icon: "⏰", label: "Total Hours",    value: `${insights.totalHours}h`,       color: sub?.color || "var(--primary)" },
              { icon: "📋", label: "Sessions",       value: insights.sessionCount,            color: "var(--primary)" },
              { icon: "✅", label: "Tasks",          value: `${insights.tasksDone}/${insights.taskCount}`, color: "var(--success)" },
              { icon: "📝", label: "Notes",          value: insights.noteCount,               color: "var(--warning)" },
              { icon: "🧠", label: "Flashcards",     value: insights.flashcardCount,          color: "var(--secondary)" },
              { icon: "🔔", label: "Cards Due",      value: insights.dueFlashcards,           color: insights.dueFlashcards > 0 ? "var(--danger)" : "var(--success)" },
            ].map((s) => (
              <div className="stat-card" key={s.label} style={{ "--accent-color": s.color }}>
                <span className="stat-icon">{s.icon}</span>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Topic progress */}
          <div className="card">
            <h2>Topic Completion</h2>
            <ProgressBar
              pct={insights.subject.totalTopics
                ? (100 * insights.subject.completedTopics) / insights.subject.totalTopics
                : 0}
              color={sub?.color}
            />
            <div style={{ display: "flex", justifyContent: "space-between",
                          fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
              <span>{insights.subject.completedTopics} completed</span>
              <span>{insights.subject.totalTopics} total</span>
            </div>
            {insights.subject.description && (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-2)" }}>
                {insights.subject.description}
              </p>
            )}
          </div>

          {/* Weekly trend */}
          <div className="card">
            <h2>Hours per Week (last 8 weeks)</h2>
            {insights.weeklyTrend.every((w) => w.hours === 0)
              ? <p className="muted">No sessions logged for this subject yet.</p>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={insights.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--text-2)" }}
                      tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-2)" }} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-3)", border: "1px solid var(--card-border)", borderRadius: 8 }}
                      formatter={(v) => [`${v}h`, "Hours"]}
                    />
                    <Bar dataKey="hours" fill={sub?.color || "var(--primary)"}
                      radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Recent sessions */}
          {insights.recentSessions.length > 0 && (
            <div className="card">
              <h2>Recent Sessions</h2>
              {insights.recentSessions.map((s) => (
                <div key={s.id} className="session-row">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`session-type-badge type-${s.type}`}>{s.type}</span>
                      <strong>{s.durationMinutes} min</strong>
                    </div>
                    {s.notes && <p className="muted small" style={{ marginTop: 4 }}>{s.notes}</p>}
                    <div className="muted small">{new Date(s.date).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Learning resources for this subject */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>🎓 Learning Resources ({subResources.length})</h2>
              <Link
                to="/learning-room"
                style={{ fontSize: 12, color: "var(--primary-light)",
                         textDecoration: "none", fontWeight: 600 }}
              >
                Open Learning Room →
              </Link>
            </div>

            {subResources.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0",
                            color: "var(--text-3)", fontSize: 13 }}>
                No resources for this subject yet.{" "}
                <Link to="/learning-room"
                  style={{ color: "var(--primary-light)", textDecoration: "none", fontWeight: 600 }}>
                  Add one in the Learning Room →
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {subResources.slice(0, 5).map((r) => {
                  const typeIcons = { video:"🎬", youtube:"▶️", link:"🔗", pdf:"📄",
                                      book:"📖", article:"📰", course:"🎓", tool:"🔧" };
                  return (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px",
                      background: "var(--bg-3)", border: "1px solid var(--card-border)",
                      borderRadius: "var(--radius-sm)", transition: "var(--transition)",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--card-border)"}
                    >
                      {/* Thumbnail or icon */}
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt=""
                          style={{ width: 50, height: 35, objectFit: "cover",
                                   borderRadius: 4, flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 50, height: 35, flexShrink: 0, borderRadius: 4,
                          background: "var(--card)", display: "flex",
                          alignItems: "center", justifyContent: "center", fontSize: 18,
                        }}>
                          {typeIcons[r.type] || "🔗"}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13,
                                      whiteSpace: "nowrap", overflow: "hidden",
                                      textOverflow: "ellipsis" }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                          {r.duration && `⏱ ${r.duration} · `}
                          {r.watchCount > 0 && `👁 ${r.watchCount}× · `}
                          {r.isFavorite && "❤️ "}
                          {r.type}
                        </div>
                      </div>

                      <Link
                        to="/learning-room"
                        className="btn btn-ghost btn-sm"
                        style={{ flexShrink: 0 }}
                      >
                        Open
                      </Link>
                    </div>
                  );
                })}
                {subResources.length > 5 && (
                  <Link to="/learning-room"
                    style={{ textAlign: "center", fontSize: 12,
                             color: "var(--primary-light)", textDecoration: "none",
                             padding: "8px 0" }}>
                    +{subResources.length - 5} more → Open Learning Room
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Flashcard reminder */}
          {insights.dueFlashcards > 0 && (
            <div className="alert alert-warning">
              🧠 You have <strong>{insights.dueFlashcards}</strong> flashcard{insights.dueFlashcards > 1 ? "s" : ""} due for review.{" "}
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/flashcards")}>
                Review now →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
