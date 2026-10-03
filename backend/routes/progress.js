const express = require("express");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");
const { computeStreak, totalHours } = require("../utils/achievements");

const router = express.Router();
router.use(authRequired);

function startOfWeekStr() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function startOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

router.get("/summary", (req, res) => {
  const uid = req.userId;
  const weekStart = startOfWeekStr();
  const monthStart = startOfMonthStr();

  const totalHrs = Math.round(totalHours(uid) * 10) / 10;
  const streak = computeStreak(uid);

  const weekMins = db
    .prepare("SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date >= ?")
    .get(uid, weekStart).m || 0;
  const monthMins = db
    .prepare("SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date >= ?")
    .get(uid, monthStart).m || 0;
  const totalSessions = db
    .prepare("SELECT COUNT(*) as n FROM sessions WHERE user_id = ?")
    .get(uid).n;

  const tasksCompleted = db
    .prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'done'")
    .get(uid).n;
  const tasksTotal = db
    .prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ?")
    .get(uid).n;
  const activeGoals = db
    .prepare("SELECT COUNT(*) as n FROM goals WHERE user_id = ?")
    .get(uid).n;

  // Per-subject breakdown
  const subjects = db.prepare("SELECT * FROM subjects WHERE user_id = ?").all(uid);
  const perSubject = subjects.map((s) => {
    const mins = db
      .prepare("SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND subject_id = ?")
      .get(uid, s.id).m || 0;
    const topicPct = s.total_topics
      ? Math.round((100 * (s.completed_topics || 0)) / s.total_topics)
      : 0;
    return {
      subjectId: s.id,
      name: s.name,
      color: s.color,
      hours: Math.round((mins / 60) * 10) / 10,
      topicCompletionPct: topicPct,
    };
  });

  // Last 16 weeks series
  const weeklySeries = [];
  for (let i = 15; i >= 0; i--) {
    const ws = new Date();
    ws.setDate(ws.getDate() - ws.getDay() - i * 7);
    ws.setHours(0, 0, 0, 0);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const wsStr = ws.toISOString().slice(0, 10);
    const weStr = we.toISOString().slice(0, 10);
    const mins = db
      .prepare("SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date >= ? AND date < ?")
      .get(uid, wsStr, weStr).m || 0;
    weeklySeries.push({ weekLabel: wsStr, hours: Math.round((mins / 60) * 10) / 10 });
  }

  // Heatmap: last 84 days
  const heatmap = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const mins = db
      .prepare("SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date(date) = ?")
      .get(uid, dayStr).m || 0;
    heatmap.push({ date: dayStr, minutes: mins });
  }

  // Daily breakdown last 14 days
  const dailyLast14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const mins = db
      .prepare("SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date(date) = ?")
      .get(uid, dayStr).m || 0;
    dailyLast14.push({ date: dayStr, hours: Math.round((mins / 60) * 10) / 10 });
  }

  res.json({
    totalHours: totalHrs,
    totalSessions,
    streak,
    weekHours: Math.round((weekMins / 60) * 10) / 10,
    monthHours: Math.round((monthMins / 60) * 10) / 10,
    tasksCompleted,
    tasksTotal,
    activeGoals,
    perSubject,
    weeklySeries,
    heatmap,
    dailyLast14,
  });
});

router.get("/export.csv", (req, res) => {
  const sessions = db
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC")
    .all(req.userId);
  const subjects = Object.fromEntries(
    db.prepare("SELECT id, name FROM subjects WHERE user_id = ?").all(req.userId).map((s) => [s.id, s.name])
  );
  const header = "date,subject,duration_minutes,type,mood,notes\n";
  const rows = sessions.map((s) => {
    const subj = (subjects[s.subject_id] || "").replace(/,/g, " ");
    const notes = (s.notes || "").replace(/[\r\n,]/g, " ");
    return `${s.date},${subj},${s.duration_minutes},${s.type},${s.mood || ""},${notes}`;
  }).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=study_sessions.csv");
  res.send(header + rows);
});

module.exports = router;
