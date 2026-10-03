const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);
const TOTAL_WEEKS = 16;

function buildWeeks(subjects, startDate) {
  const weeks = [];
  const start = new Date(startDate);
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const ws = new Date(start);
    ws.setDate(ws.getDate() + w * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);

    let focus = [];
    if (subjects.length > 0) {
      const a = subjects[w % subjects.length];
      const b = subjects[(w + 1) % subjects.length];
      focus = [...new Set([a.id, b.id])];
    }

    weeks.push({
      weekNumber: w + 1,
      startDate: ws.toISOString().slice(0, 10),
      endDate: we.toISOString().slice(0, 10),
      focusSubjectIds: focus,
      phase: w < 4 ? "Foundation" : w < 10 ? "Deep Practice" : w < 14 ? "Mock & Review" : "Final Revision",
      targetHours: 10,
    });
  }
  return weeks;
}

router.get("/", (req, res) => {
  const row = db.prepare("SELECT * FROM plans WHERE user_id = ?").get(req.userId);
  if (!row) return res.json(null);
  res.json({ ...row, weeks: JSON.parse(row.weeks_json) });
});

router.post("/generate", (req, res) => {
  const { startDate } = req.body;
  const subjects = db.prepare("SELECT * FROM subjects WHERE user_id = ?").all(req.userId);
  const start = startDate || new Date().toISOString().slice(0, 10);
  const weeks = buildWeeks(subjects, start);

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + TOTAL_WEEKS * 7);

  const existing = db.prepare("SELECT id FROM plans WHERE user_id = ?").get(req.userId);
  const id = existing?.id || uuidv4();

  if (existing) {
    db.prepare(
      "UPDATE plans SET start_date = ?, end_date = ?, weeks_json = ? WHERE user_id = ?"
    ).run(start, endDate.toISOString().slice(0, 10), JSON.stringify(weeks), req.userId);
  } else {
    db.prepare(
      "INSERT INTO plans (id, user_id, start_date, end_date, weeks_json) VALUES (?, ?, ?, ?, ?)"
    ).run(id, req.userId, start, endDate.toISOString().slice(0, 10), JSON.stringify(weeks));
  }

  res.json({ id, startDate: start, endDate: endDate.toISOString().slice(0, 10), weeks });
});

module.exports = router;
