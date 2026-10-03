const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

/* ── helpers ──────────────────────────────────────────────────────────────── */
function toClient(r) {
  if (!r) return null;
  return {
    id:             r.id,
    userId:         r.user_id,
    subjectId:      r.subject_id,
    title:          r.title,
    description:    r.description,
    status:         r.status,
    priority:       r.priority,
    startDate:      r.start_date,
    dueDate:        r.due_date,
    estimatedHours: r.estimated_hours,
    progressPct:    r.progress_pct,
    tags:           r.tags,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
  };
}

function toClientSub(r) {
  if (!r) return null;
  return {
    id:        r.id,
    taskId:    r.task_id,
    title:     r.title,
    isDone:    !!r.is_done,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

/** Attach subtasks and computed fields to a task row */
function enrich(task) {
  const subtasks = db
    .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(task.id)
    .map(toClientSub);

  const t = toClient(task);

  // Auto-derive progressPct from subtasks when subtasks exist
  let progressPct = task.progress_pct;
  if (subtasks.length > 0) {
    progressPct = Math.round((subtasks.filter((s) => s.isDone).length / subtasks.length) * 100);
  }

  // Days remaining / overdue
  const today = new Date().toISOString().slice(0, 10);
  let daysRemaining = null;
  let isOverdue = false;
  if (task.due_date) {
    const diff = Math.ceil(
      (new Date(task.due_date) - new Date(today)) / (1000 * 60 * 60 * 24)
    );
    daysRemaining = diff;
    isOverdue = diff < 0 && task.status !== "done";
  }

  // Timeline progress (start → due)
  let timelinePct = null;
  if (task.start_date && task.due_date) {
    const total = new Date(task.due_date) - new Date(task.start_date);
    const elapsed = new Date() - new Date(task.start_date);
    timelinePct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
  }

  return { ...t, progressPct, subtasks, daysRemaining, isOverdue, timelinePct };
}

/* ── CRUD — tasks ─────────────────────────────────────────────────────────── */

// GET all (with subtasks embedded)
router.get("/", (req, res) => {
  const { status, priority, subjectId, search } = req.query;
  let sql = "SELECT * FROM tasks WHERE user_id = ?";
  const params = [req.userId];

  if (status)    { sql += " AND status = ?";     params.push(status); }
  if (priority)  { sql += " AND priority = ?";   params.push(priority); }
  if (subjectId) { sql += " AND subject_id = ?"; params.push(subjectId); }
  if (search)    { sql += " AND title LIKE ?";   params.push(`%${search}%`); }

  sql += " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date ASC, created_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(enrich));
});

// GET one
router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(enrich(row));
});

// CREATE
router.post("/", (req, res) => {
  const { title, description, subjectId, status, priority,
          startDate, dueDate, estimatedHours, tags } = req.body;

  if (!title || !title.trim())
    return res.status(400).json({ error: "title is required" });

  const id  = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks
      (id, user_id, subject_id, title, description, status, priority,
       start_date, due_date, estimated_hours, progress_pct, tags, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?)
  `).run(
    id, req.userId, subjectId || null,
    title.trim(), description || "",
    status || "todo", priority || "medium",
    startDate || null, dueDate || null,
    estimatedHours || 0, tags || "", now, now
  );

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.status(201).json(enrich(row));
});

// UPDATE
router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const {
    title, description, subjectId, status, priority,
    startDate, dueDate, estimatedHours, progressPct, tags,
  } = req.body;

  // If status just flipped to "done", set progress to 100
  const finalProgress =
    (status === "done") ? 100
    : (progressPct !== undefined ? progressPct : existing.progress_pct);

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, subject_id = ?, status = ?, priority = ?,
      start_date = ?, due_date = ?, estimated_hours = ?, progress_pct = ?,
      tags = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    title          ?? existing.title,
    description    ?? existing.description,
    subjectId !== undefined ? (subjectId || null) : existing.subject_id,
    status         ?? existing.status,
    priority       ?? existing.priority,
    startDate !== undefined ? (startDate || null) : existing.start_date,
    dueDate   !== undefined ? (dueDate   || null) : existing.due_date,
    estimatedHours ?? existing.estimated_hours,
    finalProgress,
    tags           ?? existing.tags,
    new Date().toISOString(),
    req.params.id, req.userId
  );

  // If done, mark all subtasks done too
  if (status === "done") {
    db.prepare("UPDATE subtasks SET is_done = 1 WHERE task_id = ?").run(req.params.id);
  }

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  res.json(enrich(updated));
});

// DELETE
router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

/* ── Subtasks ─────────────────────────────────────────────────────────────── */

// GET subtasks for a task
router.get("/:id/subtasks", (req, res) => {
  // Verify task belongs to user
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const rows = db
    .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(req.params.id);
  res.json(rows.map(toClientSub));
});

// ADD subtask
router.post("/:id/subtasks", (req, res) => {
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { title } = req.body;
  if (!title || !title.trim())
    return res.status(400).json({ error: "title is required" });

  const id = uuidv4();
  const maxOrder = db
    .prepare("SELECT MAX(sort_order) as m FROM subtasks WHERE task_id = ?")
    .get(req.params.id).m || 0;

  db.prepare(`
    INSERT INTO subtasks (id, task_id, user_id, title, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, req.userId, title.trim(), maxOrder + 1, new Date().toISOString());

  // Sync task progress from subtasks
  syncTaskProgress(req.params.id);

  res.status(201).json(toClientSub(db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id)));
});

// TOGGLE subtask done
router.patch("/:id/subtasks/:subId", (req, res) => {
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const sub = db
    .prepare("SELECT * FROM subtasks WHERE id = ? AND task_id = ?")
    .get(req.params.subId, req.params.id);
  if (!sub) return res.status(404).json({ error: "Subtask not found" });

  const { isDone, title } = req.body;

  if (title !== undefined) {
    db.prepare("UPDATE subtasks SET title = ? WHERE id = ?").run(title.trim(), sub.id);
  }
  if (isDone !== undefined) {
    db.prepare("UPDATE subtasks SET is_done = ? WHERE id = ?").run(isDone ? 1 : 0, sub.id);
  }

  // Keep task progress in sync
  syncTaskProgress(req.params.id);

  res.json(toClientSub(db.prepare("SELECT * FROM subtasks WHERE id = ?").get(sub.id)));
});

// DELETE subtask
router.delete("/:id/subtasks/:subId", (req, res) => {
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const result = db
    .prepare("DELETE FROM subtasks WHERE id = ? AND task_id = ?")
    .run(req.params.subId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });

  syncTaskProgress(req.params.id);
  res.json({ success: true });
});

/** Recalculate task.progress_pct from its subtasks */
function syncTaskProgress(taskId) {
  const subs = db.prepare("SELECT is_done FROM subtasks WHERE task_id = ?").all(taskId);
  if (subs.length === 0) return;
  const pct = Math.round((subs.filter((s) => s.is_done).length / subs.length) * 100);
  // Also auto-mark task done when all subtasks done
  const newStatus = pct === 100 ? "done" : (pct > 0 ? "in-progress" : "todo");
  db.prepare("UPDATE tasks SET progress_pct = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(pct, newStatus, new Date().toISOString(), taskId);
}

/* ── Stats ────────────────────────────────────────────────────────────────── */
router.get("/meta/stats", (req, res) => {
  const uid = req.userId;

  const total      = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ?").get(uid).n;
  const done       = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'done'").get(uid).n;
  const inProgress = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'in-progress'").get(uid).n;
  const todo       = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'todo'").get(uid).n;
  const overdue    = db.prepare(
    "SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status != 'done' AND due_date < date('now')"
  ).get(uid).n;
  const dueToday   = db.prepare(
    "SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status != 'done' AND due_date = date('now')"
  ).get(uid).n;
  const dueThisWeek = db.prepare(
    "SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status != 'done' AND due_date BETWEEN date('now') AND date('now', '+7 days')"
  ).get(uid).n;

  const byPriority = db.prepare(
    "SELECT priority, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY priority"
  ).all(uid);

  const totalEstimated = db.prepare(
    "SELECT SUM(estimated_hours) as h FROM tasks WHERE user_id = ?"
  ).get(uid).h || 0;

  const avgProgress = db.prepare(
    "SELECT AVG(progress_pct) as p FROM tasks WHERE user_id = ? AND status != 'done'"
  ).get(uid).p || 0;

  // Completion trend: tasks completed in each of last 7 days
  const completionTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const count = db.prepare(
      "SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'done' AND date(updated_at) = ?"
    ).get(uid, dayStr).n;
    completionTrend.push({ date: dayStr, completed: count });
  }

  res.json({
    total, done, inProgress, todo, overdue, dueToday, dueThisWeek,
    completionRate: total ? Math.round((done / total) * 100) : 0,
    byPriority,
    totalEstimatedHours: Math.round(totalEstimated * 10) / 10,
    avgProgressPct: Math.round(avgProgress),
    completionTrend,
  });
});

module.exports = router;
