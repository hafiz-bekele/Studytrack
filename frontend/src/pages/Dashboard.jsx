import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import Heatmap from "../components/Heatmap.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function StatCard({ icon, label, value, sub, color = "var(--primary)", trend }) {
  return (
    <div className="stat-card" style={{ "--accent-color": color }}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? "up" : "down"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [quote, setQuote] = useState(null);
  const [milestones, setMilestones] = useState(null);
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logMin, setLogMin] = useState(30);
  const [logSubject, setLogSubject] = useState("");
  const [logging, setLogging] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/progress/summary"),
      api.get("/tasks"),
      api.get("/subjects"),
      api.get("/stats/quote"),
      api.get("/stats/milestones"),
      api.get("/resources/meta/stats"),
    ])
      .then(([s, t, sub, q, m, rs]) => {
        setSummary(s.data);
        setTasks(t.data);
        setSubjects(sub.data);
        setQuote(q.data);
        setMilestones(m.data);
        setRecentResources(rs.data?.recent || []);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const quickLog = async (e) => {
    e.preventDefault();
    if (!logMin || logMin <= 0) return;
    setLogging(true);
    try {
      const res = await api.post("/sessions", {
        subjectId: logSubject || null,
        durationMinutes: Number(logMin),
        type: "manual",
      });
      toast.success(`✅ Logged ${logMin} minutes!`);
      if (res.data.newAchievements?.length) {
        res.data.newAchievements.forEach((a) =>
          toast.success(`🏆 New badge: ${a.label}!`, { duration: 5000 })
        );
      }
      load();
    } catch {
      toast.error("Failed to log session");
    } finally {
      setLogging(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = tasks.filter((t) => t.status !== "done" && t.dueDate === today);
  const overdue  = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today);

  const examDays = (() => {
    if (!user?.exam_date) return null;
    return Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24));
  })();

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.username} 👋</h1>
        <p className="page-sub">Here's your study overview for today</p>
      </div>

      {/* Quote */}
      {quote && (
        <div style={{
          padding: "14px 20px", borderRadius: "var(--radius)",
          background: "linear-gradient(135deg, rgba(108,99,255,0.1), rgba(255,107,157,0.07))",
          border: "1px solid rgba(108,99,255,0.2)",
          marginBottom: 20, fontStyle: "italic", color: "var(--text-2)", fontSize: 13,
        }}>
          💬 "{quote.text}" — <strong style={{ color: "var(--text)" }}>{quote.author}</strong>
        </div>
      )}

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {overdue.length} overdue task{overdue.length > 1 ? "s" : ""} —{" "}
          <Link to="/tasks" style={{ color: "inherit", fontWeight: 700 }}>view tasks</Link>
        </div>
      )}
      {dueToday.length > 0 && (
        <div className="alert alert-info">
          📌 {dueToday.length} task{dueToday.length > 1 ? "s" : ""} due today
        </div>
      )}

      {/* Countdown */}
      {examDays !== null && (
        <div className="countdown-banner">
          <span>⏳</span>
          <span className="countdown-days">{Math.max(0, examDays)}</span>
          <span>day{examDays === 1 ? "" : "s"} until your target date</span>
          <span style={{ color: "var(--text-3)", marginLeft: "auto", fontSize: 12 }}>{user.exam_date}</span>
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="stat-grid">
          <StatCard icon="⏰" label="Total Hours" value={`${summary.totalHours}h`} color="var(--primary)" />
          <StatCard icon="🔥" label="Day Streak"  value={summary.streak}           color="var(--warning)" sub={summary.streak > 0 ? "Keep it going!" : "Start today!"} />
          <StatCard icon="📅" label="This Week"   value={`${summary.weekHours}h`}  color="var(--success)" sub={`Goal: ${user?.weekly_hour_goal || 10}h`} />
          <StatCard icon="📆" label="This Month"  value={`${summary.monthHours}h`} color="var(--secondary)" />
          <StatCard icon="✅" label="Tasks Done"  value={`${summary.tasksCompleted}/${summary.tasksTotal}`} color="var(--accent)" />
          <StatCard icon="📚" label="Sessions"    value={summary.totalSessions}    color="var(--info)" />
        </div>
      )}

      {/* Weekly progress */}
      {summary && (
        <div className="card">
          <h2>Weekly Goal Progress</h2>
          <ProgressBar pct={(summary.weekHours / (user?.weekly_hour_goal || 10)) * 100} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--text-2)" }}>
            <span>{summary.weekHours}h logged</span>
            <span>{user?.weekly_hour_goal || 10}h goal</span>
          </div>
        </div>
      )}

      {/* Quick log */}
      <div className="card">
        <h2>⚡ Quick Log Session</h2>
        <form onSubmit={quickLog}>
          <div className="inline-form">
            <input
              type="number" min="1" max="600"
              value={logMin}
              onChange={(e) => setLogMin(e.target.value)}
              style={{ width: 80, flex: "0 0 auto" }}
            />
            <span style={{ color: "var(--text-2)", alignSelf: "center" }}>minutes</span>
            <select value={logSubject} onChange={(e) => setLogSubject(e.target.value)} style={{ flex: 1 }}>
              <option value="">No subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn btn-primary" type="submit" disabled={logging}>
              {logging ? "Logging…" : "Log Session"}
            </button>
          </div>
        </form>
      </div>

      {/* Heatmap + Subjects */}
      <div className="grid-2">
        <div className="card">
          <h2>📅 Study Heatmap (12 weeks)</h2>
          {summary && <Heatmap data={summary.heatmap} />}
        </div>
        <div className="card">
          <h2>📚 Subject Progress</h2>
          {subjects.length === 0
            ? <p className="muted">No subjects yet — <Link to="/subjects">add one</Link></p>
            : subjects.map((s) => (
              <div key={s.id} className="subject-row">
                <div className="subject-dot" style={{ background: s.color }} />
                <span style={{ minWidth: 80, fontSize: 13 }}>{s.name}</span>
                <div style={{ flex: 1, margin: "0 10px" }}>
                  <ProgressBar pct={(100 * (s.completedTopics || 0)) / (s.totalTopics || 1)} color={s.color} />
                </div>
                <span className="muted small">{s.completedTopics || 0}/{s.totalTopics || 0}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Milestones */}
      {milestones && (
        <div className="card">
          <h2>🎖️ Next Milestones</h2>
          <div className="grid-3">
            {[
              { label: "Hours", icon: "⏰", data: milestones.hours, unit: "h" },
              { label: "Streak", icon: "🔥", data: milestones.streak, unit: " days" },
              { label: "Sessions", icon: "📋", data: milestones.sessions, unit: "" },
            ].map((m) => (
              <div className="milestone-card" key={m.label}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</div>
                <div className="milestone-value">{m.data.current}{m.unit}</div>
                <div className="milestone-label">{m.label}</div>
                {m.data.next && (
                  <>
                    <ProgressBar pct={m.data.pct} />
                    <div className="milestone-next">Next: {m.data.next}{m.unit}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's tasks */}
      <div className="card">
        <h2>📌 Today's Focus</h2>
        {dueToday.length === 0
          ? <p className="muted">Nothing due today. Check your <Link to="/planner">planner</Link> for this week's subjects.</p>
          : (
            <ul className="simple-list">
              {dueToday.map((t) => (
                <li key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{t.title}</span>
                  <span className={`tag tag-${t.priority === "high" ? "red" : t.priority === "medium" ? "yellow" : "green"}`}>
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </div>

      {/* Continue Learning */}
      {recentResources.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>🎓 Continue Learning</h2>
            <Link to="/learning-room"
              style={{ fontSize: 12, color: "var(--primary-light)", textDecoration: "none",
                       fontWeight: 600 }}>
              View all →
            </Link>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {recentResources.map((r) => {
              const ytId = r.thumbnail ? true : false;
              const typeIcons = { video:"🎬", youtube:"▶️", link:"🔗", pdf:"📄",
                                  book:"📖", article:"📰", course:"🎓", tool:"🔧" };
              return (
                <div
                  key={r.id}
                  onClick={() => navigate("/learning-room")}
                  style={{
                    flexShrink: 0, width: 150, cursor: "pointer",
                    background: "var(--bg-3)", border: "1px solid var(--card-border)",
                    borderRadius: "var(--radius-sm)", overflow: "hidden",
                    transition: "var(--transition)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.transform = ""; }}
                >
                  <div style={{
                    height: 80, overflow: "hidden",
                    background: r.thumbnail
                      ? `url(${r.thumbnail}) center/cover no-repeat`
                      : "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(255,107,157,0.1))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!r.thumbnail && (
                      <span style={{ fontSize: 32 }}>{typeIcons[r.type] || "🔗"}</span>
                    )}
                  </div>
                  <div style={{ padding: "7px 9px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3,
                                  display: "-webkit-box", WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.title}
                    </div>
                    {r.watchCount > 0 && (
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>
                        👁 {r.watchCount}× watched
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
