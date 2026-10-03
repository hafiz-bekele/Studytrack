const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");
const { checkAndAwardAchievements } = require("../utils/achievements");

const router = express.Router();
router.use(authRequired);

function toClient(r) {
  if (!r) return r;
  return {
    id: r.id,
    userId: r.user_id,
    subjectId: r.subject_id,
    taskId: r.task_id,
    durationMinutes: r.duration_minutes,
    type: r.type,
    notes: r.notes,
    mood: r.mood,
    date: r.date,
    createdAt: r.created_at,
  };
}

// List (most recent first)
router.get("/", (req, res) => {
  const { limit = 50, offset = 0, subjectId } = req.query;
  let query = "SELECT * FROM sessions WHERE user_id = ?";
  const params = [req.userId];
  if (subjectId) { query += " AND subject_id = ?"; params.push(subjectId); }
  query += " ORDER BY date DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));
  const rows = db.prepare(query).all(...params);
  const total = db.prepare(
    "SELECT COUNT(*) as n FROM sessions WHERE user_id = ?" + (subjectId ? " AND subject_id = ?" : "")
  ).get(...[req.userId, ...(subjectId ? [subjectId] : [])]).n;
  res.json({ sessions: rows.map(toClient), total });
});

// Create
router.post("/", (req, res) => {
  const { subjectId, taskId, durationMinutes, type, notes, mood, date } = req.body;
  if (!durationMinutes || durationMinutes <= 0)
    return res.status(400).json({ error: "durationMinutes must be > 0" });

  const id = uuidv4();
  const now = new Date().toISOString();
  const sessionDate = date || now;

  db.prepare(
    `INSERT INTO sessions (id, user_id, subject_id, task_id, duration_minutes, type, notes, mood, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, req.userId, subjectId || null, taskId || null,
    durationMinutes, type || "manual", notes || "", mood || "", sessionDate, now
  );

  // Update daily stats
  const dayStr = sessionDate.slice(0, 10);
  db.prepare(
    `INSERT INTO study_stats (id, user_id, date, minutes, sessions)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(user_id, date) DO UPDATE SET
       minutes = minutes + excluded.minutes,
       sessions = sessions + 1`
  ).run(uuidv4(), req.userId, dayStr, durationMinutes);

  const newAchievements = checkAndAwardAchievements(req.userId);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  res.status(201).json({ session: toClient(session), newAchievements });
});

// Edit
router.patch("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { notes, subjectId, taskId, durationMinutes, mood } = req.body;
  if (durationMinutes !== undefined && durationMinutes <= 0)
    return res.status(400).json({ error: "durationMinutes must be > 0" });

  db.prepare(
    `UPDATE sessions SET
       notes = ?, subject_id = ?, task_id = ?,
       duration_minutes = ?, mood = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    notes ?? existing.notes,
    subjectId !== undefined ? subjectId : existing.subject_id,
    taskId !== undefined ? taskId : existing.task_id,
    durationMinutes ?? existing.duration_minutes,
    mood ?? existing.mood,
    req.params.id, req.userId
  );

  const updated = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  res.json(toClient(updated));
});

// Delete
router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
