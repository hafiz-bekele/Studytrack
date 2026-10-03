const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "studytracker.sqlite");

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email       TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    exam_date   TEXT,
    weekly_hour_goal INTEGER DEFAULT 10,
    theme       TEXT DEFAULT 'dark',
    avatar      TEXT DEFAULT '',
    bio         TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    color           TEXT DEFAULT '#4f46e5',
    total_topics    INTEGER DEFAULT 0,
    completed_topics INTEGER DEFAULT 0,
    description     TEXT DEFAULT '',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id       TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    description      TEXT DEFAULT '',
    status           TEXT DEFAULT 'todo',
    priority         TEXT DEFAULT 'medium',
    due_date         TEXT,
    start_date       TEXT,
    estimated_hours  REAL DEFAULT 0,
    progress_pct     INTEGER DEFAULT 0,
    tags             TEXT DEFAULT '',
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id          TEXT PRIMARY KEY,
    task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    is_done     INTEGER DEFAULT 0,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id       TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    task_id          TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
    type             TEXT DEFAULT 'manual',
    notes            TEXT DEFAULT '',
    mood             TEXT DEFAULT '',
    date             TEXT DEFAULT (datetime('now')),
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    tags        TEXT DEFAULT '',
    is_pinned   INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id      TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    correct_streak  INTEGER DEFAULT 0,
    last_reviewed   TEXT,
    next_review     TEXT DEFAULT (datetime('now')),
    difficulty      TEXT DEFAULT 'medium',
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id   TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    type         TEXT NOT NULL,
    target_hours REAL NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resources (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    type        TEXT DEFAULT 'link',
    is_favorite INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code      TEXT NOT NULL,
    label     TEXT NOT NULL,
    desc      TEXT NOT NULL,
    earned_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, code)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    start_date TEXT NOT NULL,
    end_date   TEXT NOT NULL,
    weeks_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    remind_at   TEXT NOT NULL,
    repeat      TEXT DEFAULT 'none',
    is_done     INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_stats (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    minutes     INTEGER DEFAULT 0,
    sessions    INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
  );
`);

module.exports = db;
