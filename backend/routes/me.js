const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

router.get("/", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(safeUser(user));
});

router.put("/", async (req, res) => {
  const { examDate, weeklyHourGoal, theme, newPassword, avatar, bio } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  let passwordHash = user.password_hash;
  if (newPassword) {
    if (newPassword.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  db.prepare(
    `UPDATE users SET
       exam_date = ?, weekly_hour_goal = ?, theme = ?,
       password_hash = ?, avatar = ?, bio = ?
     WHERE id = ?`
  ).run(
    examDate !== undefined ? examDate : user.exam_date,
    weeklyHourGoal !== undefined ? weeklyHourGoal : user.weekly_hour_goal,
    theme !== undefined ? theme : user.theme,
    passwordHash,
    avatar !== undefined ? avatar : user.avatar,
    bio !== undefined ? bio : user.bio,
    req.userId
  );

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json(safeUser(updated));
});

module.exports = router;
