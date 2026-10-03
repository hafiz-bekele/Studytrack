import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api";
import toast from "react-hot-toast";

/* ── constants ──────────────────────────────────────────────────────────── */
const STATUSES   = ["todo", "in-progress", "done"];
const PRIORITIES = ["low", "medium", "high"];

const STATUS_META = {
  "todo":        { label: "To Do",       color: "var(--text-3)",    bg: "rgba(255,255,255,0.06)", icon: "○" },
  "in-progress": { label: "In Progress", color: "var(--warning)",   bg: "rgba(255,209,102,0.1)", icon: "◑" },
  "done":        { label: "Done",        color: "var(--success)",   bg: "rgba(6,214,160,0.1)",   icon: "●" },
};

const PRIORITY_META = {
  low:    { color: "var(--success)",   label: "Low",    dot: "#06d6a0" },
  medium: { color: "var(--warning)",   label: "Medium", dot: "#ffd166" },
  high:   { color: "var(--danger)",    label: "High",   dot: "#ef476f" },
};

const EMPTY_FORM = {
  title: "", description: "", subjectId: "",
  priority: "medium", status: "todo",
  startDate: "", dueDate: "", estimatedHours: "",
  tags: "",
};

/* ── tiny helpers ───────────────────────────────────────────────────────── */
function daysLabel(daysRemaining, status) {
  if (status === "done") return null;
  if (daysRemaining === null) return null;
  if (daysRemaining < 0)  return { text: `${Math.abs(daysRemaining)}d overdue`, color: "var(--danger)" };
  if (daysRemaining === 0) return { text: "Due today",                           color: "var(--warning)" };
  if (daysRemaining <= 3)  return { text: `${daysRemaining}d left`,              color: "var(--warning)" };
  return                          { text: `${daysRemaining}d left`,              color: "var(--text-3)" };
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components
══════════════════════════════════════════════════════════════════════════ */

/* ── Progress ring ──────────────────────────────────────────────────────── */
function ProgressRing({ pct = 0, size = 44, stroke = 4, color = "var(--primary)" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle"
        fill={pct === 100 ? "var(--success)" : "var(--text)"}
        fontSize={size < 40 ? 9 : 11} fontWeight="700" fontFamily="Inter,sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

/* ── Timeline bar ───────────────────────────────────────────────────────── */
function TimelineBar({ startDate, dueDate, timelinePct }) {
  if (!startDate || !dueDate) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize: 10, color:"var(--text-3)", marginBottom: 3 }}>
        <span>{fmtDate(startDate)}</span>
        <span>{fmtDate(dueDate)}</span>
      </div>
      <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:999, height:5, overflow:"hidden" }}>
        <div style={{
          width: `${timelinePct ?? 0}%`, height:"100%", borderRadius: 999,
          background: (timelinePct ?? 0) > 90
            ? "var(--danger)" : (timelinePct ?? 0) > 70
            ? "var(--warning)" : "var(--primary)",
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Subtask list (inside expanded task card) ───────────────────────────── */
function SubtaskList({ taskId, subtasks, onUpdate }) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding]    = useState(false);
  const inputRef               = useRef(null);

  const add = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.post(`/tasks/${taskId}/subtasks`, { title: newTitle });
      setNewTitle("");
      setAdding(false);
      onUpdate();
    } catch { toast.error("Failed to add subtask"); }
  };

  const toggle = async (sub) => {
    try {
      await api.patch(`/tasks/${taskId}/subtasks/${sub.id}`, { isDone: !sub.isDone });
      onUpdate();
    } catch { toast.error("Failed to update subtask"); }
  };

  const remove = async (subId) => {
    try {
      await api.delete(`/tasks/${taskId}/subtasks/${subId}`);
      onUpdate();
    } catch { toast.error("Failed to delete subtask"); }
  };

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color:"var(--text-3)",
                    textTransform:"uppercase", letterSpacing:"0.5px", marginBottom: 8 }}>
        Subtasks ({subtasks.filter(s=>s.isDone).length}/{subtasks.length})
      </div>

      {subtasks.map((sub) => (
        <div key={sub.id} style={{
          display:"flex", alignItems:"center", gap: 8,
          padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)",
        }}>
          {/* Checkbox */}
          <button
            onClick={() => toggle(sub)}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${sub.isDone ? "var(--success)" : "var(--card-border)"}`,
              background: sub.isDone ? "var(--success)" : "transparent",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s", padding: 0,
            }}
          >
            {sub.isDone && <span style={{ color:"#fff", fontSize: 10, lineHeight:1 }}>✓</span>}
          </button>

          <span style={{
            flex: 1, fontSize: 13,
            color: sub.isDone ? "var(--text-3)" : "var(--text)",
            textDecoration: sub.isDone ? "line-through" : "none",
            transition:"all 0.2s",
          }}>
            {sub.title}
          </span>

          <button
            onClick={() => remove(sub.id)}
            style={{ background:"none", border:"none", cursor:"pointer",
                     color:"var(--text-3)", fontSize:13, lineHeight:1, padding:"0 2px" }}
          >×</button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={add} style={{ display:"flex", gap: 6, marginTop: 8 }}>
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask title…"
            style={{ flex:1, padding:"6px 10px", fontSize:13 }}
          />
          <button className="btn btn-primary btn-sm" type="submit">Add</button>
          <button className="btn btn-ghost btn-sm" type="button"
            onClick={() => { setAdding(false); setNewTitle(""); }}>✕</button>
        </form>
      ) : (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 8, width:"100%", justifyContent:"center" }}
          onClick={() => setAdding(true)}
        >
          + Add subtask
        </button>
      )}
    </div>
  );
}

/* ── Task Card (used in both list and kanban) ───────────────────────────── */
function TaskCard({ task, subjects, onUpdate, onEdit, view }) {
  const [expanded, setExpanded] = useState(false);
  const subjectName = subjects.find((s) => s.id === task.subjectId)?.name;
  const dl = daysLabel(task.daysRemaining, task.status);
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const sm = STATUS_META[task.status]     || STATUS_META.todo;

  const changeStatus = async (status) => {
    try {
      await api.put(`/tasks/${task.id}`, { status });
      onUpdate();
    } catch { toast.error("Failed to update status"); }
  };

  const remove = async () => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success("Task deleted");
      onUpdate();
    } catch { toast.error("Failed to delete task"); }
  };

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--card-border)",
      borderLeft: `4px solid ${pm.dot}`,
      borderRadius: "var(--radius)", padding: "16px",
      transition: "var(--transition)", marginBottom: view === "list" ? 10 : 0,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.transform = ""; }}
    >
      {/* Top row */}
      <div style={{ display:"flex", gap: 10, alignItems:"flex-start" }}>
        <ProgressRing pct={task.progressPct} size={44}
          color={task.status === "done" ? "var(--success)" : "var(--primary)"} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:"flex", alignItems:"center", gap: 8, flexWrap:"wrap" }}>
            <span style={{
              fontWeight: 700, fontSize: 14,
              color: task.status === "done" ? "var(--text-3)" : "var(--text)",
              textDecoration: task.status === "done" ? "line-through" : "none",
            }}>{task.title}</span>

            {/* Priority badge */}
            <span style={{
              padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700,
              background: `${pm.dot}20`, color: pm.color, border:`1px solid ${pm.dot}40`,
            }}>{pm.label}</span>

            {/* Overdue / due soon badge */}
            {dl && (
              <span style={{ fontSize:10, fontWeight:700, color: dl.color }}>
                {task.isOverdue ? "⚠ " : "⏰ "}{dl.text}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div style={{ display:"flex", gap:12, marginTop: 5, flexWrap:"wrap",
                        fontSize:11, color:"var(--text-3)" }}>
            {subjectName && <span>📚 {subjectName}</span>}
            {task.estimatedHours > 0 && <span>⏱ {task.estimatedHours}h estimated</span>}
            {task.startDate && <span>▶ {fmtDate(task.startDate)}</span>}
            {task.dueDate   && <span>⏹ {fmtDate(task.dueDate)}</span>}
            {task.subtasks?.length > 0 && (
              <span>☑ {task.subtasks.filter(s=>s.isDone).length}/{task.subtasks.length} subtasks</span>
            )}
            {task.tags && task.tags.split(",").filter(Boolean).map((t) => (
              <span key={t} style={{
                background:"rgba(108,99,255,0.12)", color:"var(--primary-light)",
                padding:"1px 7px", borderRadius:999, border:"1px solid rgba(108,99,255,0.2)",
              }}>{t.trim()}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline bar */}
      <TimelineBar startDate={task.startDate} dueDate={task.dueDate}
        timelinePct={task.timelinePct} />

      {/* Description */}
      {task.description && !expanded && (
        <p style={{ marginTop: 8, fontSize:12, color:"var(--text-2)",
                    whiteSpace:"pre-wrap", display:"-webkit-box",
                    WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {task.description}
        </p>
      )}

      {/* Actions row */}
      <div style={{ display:"flex", gap: 6, marginTop: 12, flexWrap:"wrap", alignItems:"center" }}>
        {/* Status selector */}
        <div style={{ display:"flex", gap: 4 }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              style={{
                padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                cursor:"pointer", border:`1px solid ${task.status === s ? STATUS_META[s].color : "var(--card-border)"}`,
                background: task.status === s ? STATUS_META[s].bg : "transparent",
                color: task.status === s ? STATUS_META[s].color : "var(--text-3)",
                transition:"all 0.15s",
              }}
            >{STATUS_META[s].icon} {STATUS_META[s].label}</button>
          ))}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setExpanded((x) => !x)}>
            {expanded ? "▲ Less" : "▼ More"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>✏ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={remove}>🗑</button>
        </div>
      </div>

      {/* Expanded: description + subtasks */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop:"1px solid var(--card-border)", paddingTop:12 }}>
          {task.description && (
            <p style={{ fontSize:13, color:"var(--text-2)", whiteSpace:"pre-wrap", marginBottom:8 }}>
              {task.description}
            </p>
          )}
          <SubtaskList taskId={task.id} subtasks={task.subtasks || []} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

/* ── Stats bar ──────────────────────────────────────────────────────────── */
function StatsBar({ stats }) {
  if (!stats) return null;
  const cards = [
    { icon:"📋", label:"Total",       value: stats.total,             color:"var(--primary)" },
    { icon:"○",  label:"To Do",       value: stats.todo,              color:"var(--text-3)" },
    { icon:"◑",  label:"In Progress", value: stats.inProgress,        color:"var(--warning)" },
    { icon:"●",  label:"Done",        value: stats.done,              color:"var(--success)" },
    { icon:"⚠",  label:"Overdue",     value: stats.overdue,           color: stats.overdue > 0 ? "var(--danger)" : "var(--text-3)" },
    { icon:"📅",  label:"Due Today",   value: stats.dueToday,          color: stats.dueToday > 0 ? "var(--warning)" : "var(--text-3)" },
    { icon:"✅",  label:"Completion",  value: `${stats.completionRate}%`, color:"var(--accent)" },
    { icon:"⏱",  label:"Est. Hours",  value: `${stats.totalEstimatedHours}h`, color:"var(--secondary)" },
  ];

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))",
      gap: 10, marginBottom: 22,
    }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background:"var(--card)", border:"1px solid var(--card-border)",
          borderRadius:"var(--radius)", padding:"14px 16px",
          borderTop: `3px solid ${c.color}`, transition:"var(--transition)",
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: c.color,
                        letterSpacing:"-1px", lineHeight:1 }}>{c.value}</div>
          <div style={{ fontSize: 11, color:"var(--text-3)", marginTop: 3,
                        textTransform:"uppercase", letterSpacing:"0.5px" }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Add / Edit modal ───────────────────────────────────────────────────── */
function TaskModal({ form, setForm, subjects, onSubmit, onClose, editingId, saving }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.65)",
      zIndex:300, display:"flex", alignItems:"center", justifyContent:"center",
      padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:"var(--bg-2)", border:"1px solid var(--card-border)",
        borderRadius:"var(--radius-lg)", padding:28, width:"100%", maxWidth:560,
        maxHeight:"90vh", overflowY:"auto",
        boxShadow:"var(--shadow-lg)", animation:"scaleIn 0.2s ease",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:800 }}>
            {editingId ? "✏ Edit Task" : "✚ New Task"}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Task name *</label>
            <input
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              placeholder="Optional details, notes, links…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Row: Subject + Priority */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">None</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Start date + Due date */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="form-group">
              <label className="form-label">Start date</label>
              <input type="date" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Due date</label>
              <input type="date" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          {/* Row: Estimated hours + Status */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="form-group">
              <label className="form-label">Estimated duration (hours)</label>
              <input type="number" min="0" step="0.5"
                placeholder="e.g. 2.5"
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input
              placeholder="e.g. exam, revision, chapter-3"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Kanban column ──────────────────────────────────────────────────────── */
function KanbanColumn({ status, tasks, subjects, onUpdate, onEdit }) {
  const sm = STATUS_META[status];
  return (
    <div style={{
      background:"var(--bg-2)", border:"1px solid var(--card-border)",
      borderRadius:"var(--radius)", padding:14, minHeight:200,
      display:"flex", flexDirection:"column", gap:10,
    }}>
      {/* Column header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom: 6 }}>
        <div style={{ display:"flex", alignItems:"center", gap: 7 }}>
          <span style={{ fontSize:16, color: sm.color }}>{sm.icon}</span>
          <span style={{ fontWeight:700, fontSize:13 }}>{sm.label}</span>
        </div>
        <span style={{
          background: sm.bg, color: sm.color, border:`1px solid ${sm.color}40`,
          borderRadius:99, padding:"2px 9px", fontSize:11, fontWeight:700,
        }}>{tasks.length}</span>
      </div>

      {/* Cards */}
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} subjects={subjects}
          onUpdate={onUpdate} onEdit={onEdit} view="kanban" />
      ))}

      {tasks.length === 0 && (
        <div style={{ textAlign:"center", color:"var(--text-3)", fontSize:13,
                      padding:"24px 0", border:"2px dashed var(--card-border)",
                      borderRadius:"var(--radius-sm)" }}>
          Empty
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════════════════ */
export default function Tasks() {
  const [tasks,    setTasks]    = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  // UI state
  const [view,       setView]       = useState("list");   // list | kanban
  const [filter,     setFilter]     = useState("all");
  const [sortBy,     setSortBy]     = useState("priority"); // priority | dueDate | created
  const [search,     setSearch]     = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  /* ── data fetching ────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const [tasksRes, subjectsRes, statsRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/subjects"),
        api.get("/tasks/meta/stats"),
      ]);
      setTasks(tasksRes.data);
      setSubjects(subjectsRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── modal helpers ────────────────────────────────────────────────────── */
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingId(task.id);
    setForm({
      title:          task.title,
      description:    task.description || "",
      subjectId:      task.subjectId   || "",
      priority:       task.priority    || "medium",
      status:         task.status      || "todo",
      startDate:      task.startDate   || "",
      dueDate:        task.dueDate     || "",
      estimatedHours: task.estimatedHours || "",
      tags:           task.tags        || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  /* ── submit ───────────────────────────────────────────────────────────── */
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0,
      subjectId:      form.subjectId || null,
      startDate:      form.startDate || null,
      dueDate:        form.dueDate   || null,
    };
    try {
      if (editingId) {
        await api.put(`/tasks/${editingId}`, payload);
        toast.success("Task updated ✓");
      } else {
        await api.post("/tasks", payload);
        toast.success("Task created ✓");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── filtering / sorting ──────────────────────────────────────────────── */
  const visible = tasks
    .filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  /* ── kanban groups ────────────────────────────────────────────────────── */
  const byStatus = (s) => visible.filter((t) => t.status === s);

  if (loading) return (
    <div className="loading-center"><div className="spinner" /><span>Loading tasks…</span></div>
  );

  return (
    <div className="animate-in">
      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="page-title">📋 Todo List</h1>
          <p className="page-sub">Track tasks with duration, dates and subtasks</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          ✚ New Task
        </button>
      </div>

      {/* ── Stats bar ── */}
      <StatsBar stats={stats} />

      {/* Overdue alert */}
      {stats?.overdue > 0 && (
        <div className="alert alert-error" style={{ marginBottom:16 }}>
          ⚠ {stats.overdue} overdue task{stats.overdue > 1 ? "s" : ""} need your attention
        </div>
      )}
      {stats?.dueToday > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:16 }}>
          📅 {stats.dueToday} task{stats.dueToday > 1 ? "s" : ""} due today
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {/* Search */}
        <input
          className="search-input"
          placeholder="🔍 Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex:1, minWidth:160, margin:0 }}
        />

        {/* Filter tabs */}
        <div className="tabs" style={{ margin:0 }}>
          {["all", ...STATUSES].map((f) => (
            <button key={f}
              className={`tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_META[f].label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ width:"auto", padding:"7px 12px" }}
        >
          <option value="priority">Sort: Priority</option>
          <option value="dueDate">Sort: Due Date</option>
          <option value="created">Sort: Newest</option>
        </select>

        {/* View toggle */}
        <div className="tabs" style={{ margin:0 }}>
          <button className={`tab ${view === "list"   ? "active" : ""}`} onClick={() => setView("list")}>≡ List</button>
          <button className={`tab ${view === "kanban" ? "active" : ""}`} onClick={() => setView("kanban")}>⊞ Board</button>
        </div>
      </div>

      {/* ── List view ── */}
      {view === "list" && (
        <div>
          {visible.length === 0 ? (
            <div style={{
              textAlign:"center", padding:"60px 20px",
              color:"var(--text-3)", border:"2px dashed var(--card-border)",
              borderRadius:"var(--radius)",
            }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:16, fontWeight:600 }}>No tasks yet</div>
              <p style={{ fontSize:13, marginTop:6 }}>Click "New Task" to get started</p>
            </div>
          ) : (
            visible.map((t) => (
              <TaskCard key={t.id} task={t} subjects={subjects}
                onUpdate={load} onEdit={openEdit} view="list" />
            ))
          )}
        </div>
      )}

      {/* ── Kanban view ── */}
      {view === "kanban" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14 }}>
          {STATUSES.map((s) => (
            <KanbanColumn key={s} status={s} tasks={byStatus(s)}
              subjects={subjects} onUpdate={load} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <TaskModal
          form={form} setForm={setForm}
          subjects={subjects}
          onSubmit={submit} onClose={closeModal}
          editingId={editingId} saving={saving}
        />
      )}
    </div>
  );
}
