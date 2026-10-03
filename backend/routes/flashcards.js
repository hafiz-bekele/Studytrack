const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

function toClient(r) {
  if (!r) return r;
  return {
    id: r.id,
    userId: r.user_id,
    subjectId: r.subject_id,
    question: r.question,
    answer: r.answer,
    correctStreak: r.correct_streak,
    lastReviewed: r.last_reviewed,
    nextReview: r.next_review,
    difficulty: r.difficulty,
    createdAt: r.created_at,
  };
}

router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM flashcards WHERE user_id = ? ORDER BY next_review ASC")
    .all(req.userId);
  res.json(rows.map(toClient));
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM flashcards WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(toClient(row));
});

router.post("/", (req, res) => {
  const { question, answer, subjectId, difficulty } = req.body;
  if (!question || !answer)
    return res.status(400).json({ error: "question and answer are required" });

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO flashcards (id, user_id, subject_id, question, answer, difficulty, next_review, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, subjectId || null, question, answer, difficulty || "medium", now, now);

  res.status(201).json(toClient(db.prepare("SELECT * FROM flashcards WHERE id = ?").get(id)));
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM flashcards WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { question, answer, subjectId, difficulty } = req.body;
  db.prepare(
    `UPDATE flashcards SET question = ?, answer = ?, subject_id = ?, difficulty = ? WHERE id = ?`
  ).run(
    question ?? existing.question,
    answer ?? existing.answer,
    subjectId !== undefined ? subjectId : existing.subject_id,
    difficulty ?? existing.difficulty,
    req.params.id
  );
  res.json(toClient(db.prepare("SELECT * FROM flashcards WHERE id = ?").get(req.params.id)));
});

router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM flashcards WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

// Spaced-repetition review — intervals: 1,2,4,7,14,30 days
router.post("/:id/review", (req, res) => {
  const { correct } = req.body;
  const card = db
    .prepare("SELECT * FROM flashcards WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!card) return res.status(404).json({ error: "Not found" });

  const intervals = [1, 2, 4, 7, 14, 30];
  const newStreak = correct ? (card.correct_streak || 0) + 1 : 0;
  const days = intervals[Math.min(newStreak, intervals.length - 1)];
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + days);

  db.prepare(
    `UPDATE flashcards SET correct_streak = ?, last_reviewed = ?, next_review = ? WHERE id = ?`
  ).run(newStreak, now.toISOString(), nextReview.toISOString(), req.params.id);

  res.json(toClient(db.prepare("SELECT * FROM flashcards WHERE id = ?").get(req.params.id)));
});

module.exports = router;
