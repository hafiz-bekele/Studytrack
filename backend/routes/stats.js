/**
 * Extra feature routes:
 *  GET  /stats/quote          – motivational quote of the day
 *  GET  /stats/focus          – focus breakdown (by hour-of-day, by type, mood, weekday)
 *  GET  /stats/pomodoro       – pomodoro count and total focus time
 *  GET  /stats/tasks          – task completion stats
 *  GET  /stats/notes          – notes count + word count
 *  GET  /stats/subject/:id    – deep per-subject insights
 *  GET  /stats/streak-history – daily data for last 365 days
 *  GET  /stats/milestones     – next milestone (hours, streak, sessions)
 *  GET  /stats/reminders      – list reminders
 *  POST /stats/reminders      – create reminder
 *  DELETE /stats/reminders/:id
 */
const express = require("express");
const { v4: uuidv4 } = require("uuid");          // ← must be at top
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");
const { computeStreak, totalHours } = require("../utils/achievements");

const router = express.Router();
router.use(authRequired);

/* ── Quotes ──────────────────────────────────────────────────────────────── */
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Study while others are sleeping; work while others are loafing.", author: "William Arthur Ward" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Knowledge is power.", author: "Francis Bacon" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "A little progress each day adds up to big results.", author: "Satya Nani" },
];

router.get("/quote", (req, res) => {
  const idx = Math.floor(Date.now() / 86400000) % QUOTES.length;
  res.json(QUOTES[idx]);
});

/* ── Focus breakdown ─────────────────────────────────────────────────────── */
router.get("/focus", (req, res) => {
  const byHour = db.prepare(
    `SELECT strftime('%H', date) as hour, SUM(duration_minutes) as minutes
     FROM sessions WHERE user_id = ? GROUP BY hour ORDER BY hour`
  ).all(req.userId);

  const byType = db.prepare(
    `SELECT type, COUNT(*) as count, SUM(duration_minutes) as minutes
     FROM sessions WHERE user_id = ? GROUP BY type`
  ).all(req.userId);

  const byMood = db.prepare(
    `SELECT mood, COUNT(*) as count FROM sessions
     WHERE user_id = ? AND mood != '' GROUP BY mood`
  ).all(req.userId);

  const avg = db.prepare(
    "SELECT AVG(duration_minutes) as avg FROM sessions WHERE user_id = ?"
  ).get(req.userId);

  const byWeekday = db.prepare(
    `SELECT strftime('%w', date) as dow, SUM(duration_minutes) as minutes
     FROM sessions WHERE user_id = ? GROUP BY dow ORDER BY minutes DESC`
  ).all(req.userId);

  // Last 14 days daily breakdown
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const mins = db.prepare(
      "SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date(date) = ?"
    ).get(req.userId, dayStr).m || 0;
    last14.push({ date: dayStr, minutes: mins, hours: Math.round((mins / 60) * 10) / 10 });
  }

  res.json({ byHour, byType, byMood, avgSessionMinutes: Math.round(avg.avg || 0), byWeekday, last14 });
});

/* ── Pomodoro stats ──────────────────────────────────────────────────────── */
router.get("/pomodoro", (req, res) => {
  const row = db.prepare(
    `SELECT COUNT(*) as count, SUM(duration_minutes) as minutes
     FROM sessions WHERE user_id = ? AND type = 'pomodoro'`
  ).get(req.userId);

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = db.prepare(
    `SELECT COUNT(*) as count FROM sessions
     WHERE user_id = ? AND type = 'pomodoro' AND date(date) = ?`
  ).get(req.userId, today);

  const bestDay = db.prepare(
    `SELECT date(date) as d, COUNT(*) as count
     FROM sessions WHERE user_id = ? AND type = 'pomodoro'
     GROUP BY d ORDER BY count DESC LIMIT 1`
  ).get(req.userId);

  res.json({
    total: row.count || 0,
    totalHours: Math.round(((row.minutes || 0) / 60) * 10) / 10,
    todayCount: todayRow.count || 0,
    bestDay: bestDay || null,
  });
});

/* ── Task stats ──────────────────────────────────────────────────────────── */
router.get("/tasks", (req, res) => {
  const total      = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ?").get(req.userId).n;
  const done       = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'done'").get(req.userId).n;
  const inProgress = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'in-progress'").get(req.userId).n;
  const todo       = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status = 'todo'").get(req.userId).n;
  const overdue    = db.prepare(
    "SELECT COUNT(*) as n FROM tasks WHERE user_id = ? AND status != 'done' AND due_date < date('now')"
  ).get(req.userId).n;
  const byPriority = db.prepare(
    "SELECT priority, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY priority"
  ).all(req.userId);
  res.json({
    total, done, inProgress, todo, overdue, byPriority,
    completionRate: total ? Math.round((done / total) * 100) : 0,
  });
});

/* ── Notes stats ─────────────────────────────────────────────────────────── */
router.get("/notes", (req, res) => {
  const notes = db.prepare("SELECT content FROM notes WHERE user_id = ?").all(req.userId);
  const wordCount = notes.reduce(
    (sum, n) => sum + (n.content || "").split(/\s+/).filter(Boolean).length, 0
  );
  const pinned = db.prepare(
    "SELECT COUNT(*) as n FROM notes WHERE user_id = ? AND is_pinned = 1"
  ).get(req.userId).n;
  const bySubject = db.prepare(
    `SELECT s.name, COUNT(*) as count FROM notes n
     LEFT JOIN subjects s ON s.id = n.subject_id
     WHERE n.user_id = ? GROUP BY n.subject_id`
  ).all(req.userId);
  res.json({ total: notes.length, wordCount, pinned, bySubject });
});

/* ── Subject insights ────────────────────────────────────────────────────── */
router.get("/subject/:id", (req, res) => {
  const uid = req.userId;
  const sid = req.params.id;

  const subject = db.prepare("SELECT * FROM subjects WHERE id = ? AND user_id = ?").get(sid, uid);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  const sessions = db.prepare(
    "SELECT * FROM sessions WHERE user_id = ? AND subject_id = ? ORDER BY date DESC"
  ).all(uid, sid);

  const totalMins = sessions.reduce((s, x) => s + x.duration_minutes, 0);
  const tasks      = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND subject_id = ?").all(uid, sid);
  const notes      = db.prepare("SELECT * FROM notes WHERE user_id = ? AND subject_id = ?").all(uid, sid);
  const flashcards = db.prepare("SELECT * FROM flashcards WHERE user_id = ? AND subject_id = ?").all(uid, sid);

  const weeklyTrend = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date();
    ws.setDate(ws.getDate() - ws.getDay() - i * 7);
    ws.setHours(0, 0, 0, 0);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const wsStr = ws.toISOString().slice(0, 10);
    const weStr = we.toISOString().slice(0, 10);
    const mins = db.prepare(
      "SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND subject_id = ? AND date >= ? AND date < ?"
    ).get(uid, sid, wsStr, weStr).m || 0;
    weeklyTrend.push({ week: wsStr, hours: Math.round((mins / 60) * 10) / 10 });
  }

  res.json({
    subject: {
      id: subject.id, name: subject.name, color: subject.color,
      totalTopics: subject.total_topics, completedTopics: subject.completed_topics,
      description: subject.description,
    },
    totalHours: Math.round((totalMins / 60) * 10) / 10,
    sessionCount: sessions.length,
    taskCount: tasks.length,
    tasksDone: tasks.filter((t) => t.status === "done").length,
    noteCount: notes.length,
    flashcardCount: flashcards.length,
    dueFlashcards: flashcards.filter((c) => new Date(c.next_review) <= new Date()).length,
    weeklyTrend,
    recentSessions: sessions.slice(0, 5).map((s) => ({
      id: s.id, date: s.date, durationMinutes: s.duration_minutes, type: s.type, notes: s.notes,
    })),
  });
});

/* ── Streak history (last 365 days) ──────────────────────────────────────── */
router.get("/streak-history", (req, res) => {
  const data = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const mins = db.prepare(
      "SELECT SUM(duration_minutes) as m FROM sessions WHERE user_id = ? AND date(date) = ?"
    ).get(req.userId, dayStr).m || 0;
    data.push({ date: dayStr, minutes: mins });
  }
  res.json(data);
});

/* ── Next milestones ─────────────────────────────────────────────────────── */
router.get("/milestones", (req, res) => {
  const uid      = req.userId;
  const hrs      = totalHours(uid);
  const streak   = computeStreak(uid);
  const sessions = db.prepare("SELECT COUNT(*) as n FROM sessions WHERE user_id = ?").get(uid).n;

  const hourMilestones    = [10, 50, 100, 200, 500, 1000];
  const streakMilestones  = [3, 7, 14, 30, 60, 100];
  const sessionMilestones = [10, 25, 50, 100, 250, 500];

  const nextHour    = hourMilestones.find((m) => m > hrs) || null;
  const nextStreak  = streakMilestones.find((m) => m > streak) || null;
  const nextSession = sessionMilestones.find((m) => m > sessions) || null;

  res.json({
    hours:    { current: Math.round(hrs * 10) / 10,    next: nextHour,    pct: nextHour    ? Math.round((hrs / nextHour) * 100)          : 100 },
    streak:   { current: streak,                        next: nextStreak,  pct: nextStreak  ? Math.round((streak / nextStreak) * 100)      : 100 },
    sessions: { current: sessions,                      next: nextSession, pct: nextSession ? Math.round((sessions / nextSession) * 100)  : 100 },
  });
});

/* ── Reminders ───────────────────────────────────────────────────────────── */
router.get("/reminders", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at ASC")
    .all(req.userId);
  res.json(rows);
});

router.post("/reminders", (req, res) => {
  const { title, remindAt, repeat } = req.body;
  if (!title || !remindAt)
    return res.status(400).json({ error: "title and remindAt are required" });
  const id = uuidv4();
  db.prepare(
    "INSERT INTO reminders (id, user_id, title, remind_at, repeat) VALUES (?, ?, ?, ?, ?)"
  ).run(id, req.userId, title, remindAt, repeat || "none");
  res.status(201).json(db.prepare("SELECT * FROM reminders WHERE id = ?").get(id));
});

router.delete("/reminders/:id", (req, res) => {
  const r = db
    .prepare("DELETE FROM reminders WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
