const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/* ── Helpers ──────────────────────────────────────────────────────────── */
function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
}

/**
 * Password rules:
 *  - At least 6 characters
 *  - At least one uppercase letter  (A-Z)
 *  - At least one lowercase letter  (a-z)
 *  - At least one digit             (0-9)
 *  - At least one special character (!@#$%^&* etc.)
 */
function validatePassword(p) {
  if (!p || p.length < 6)
    return "Password must be at least 6 characters";
  if (!/[A-Z]/.test(p))
    return "Password must contain at least one uppercase letter (A-Z)";
  if (!/[a-z]/.test(p))
    return "Password must contain at least one lowercase letter (a-z)";
  if (!/[0-9]/.test(p))
    return "Password must contain at least one number (0-9)";
  if (!/[^A-Za-z0-9]/.test(p))
    return "Password must contain at least one special character (!@#$%^&*…)";
  return null; // valid
}

/* ── Register ─────────────────────────────────────────────────────────── */
router.post("/register", async (req, res) => {
  const { username, email, password, examDate, weeklyHourGoal } = req.body;

  if (!username || !username.trim())
    return res.status(400).json({ error: "Username is required" });

  if (!email || !email.trim())
    return res.status(400).json({ error: "Email is required" });
  if (!isValidEmail(email))
    return res.status(400).json({ error: "Please enter a valid email address" });

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  // Uniqueness checks
  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username.trim());
  if (existingUser)
    return res.status(409).json({ error: "Username is already taken" });

  const existingEmail = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.trim().toLowerCase());
  if (existingEmail)
    return res.status(409).json({ error: "An account with that email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const id  = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users
       (id, username, email, password_hash, exam_date, weekly_hour_goal, theme, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'dark', ?)`
  ).run(
    id,
    username.trim(),
    email.trim().toLowerCase(),
    passwordHash,
    examDate || null,
    weeklyHourGoal || 10,
    now
  );

  const user  = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const token = jwt.sign({ userId: id }, SECRET, { expiresIn: "30d" });
  res.status(201).json({ token, user: safeUser(user) });
});

/* ── Login ────────────────────────────────────────────────────────────── */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username/email and password are required" });

  // Allow login with either username OR email
  const user = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(username.trim(), username.trim().toLowerCase());

  if (!user)
    return res.status(401).json({ error: "Invalid username/email or password" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    return res.status(401).json({ error: "Invalid username/email or password" });

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "30d" });
  res.json({ token, user: safeUser(user) });
});

module.exports = router;
