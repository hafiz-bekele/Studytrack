/**
 * Safe migrations — adds new columns / tables to an existing SQLite database.
 * Called once at server start from db.js.
 */
const db = require("./db");

function columnExists(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
}

function tableExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

// tasks — new columns added in v2
if (!columnExists("tasks", "start_date"))      db.prepare("ALTER TABLE tasks ADD COLUMN start_date TEXT").run();
if (!columnExists("tasks", "estimated_hours")) db.prepare("ALTER TABLE tasks ADD COLUMN estimated_hours REAL DEFAULT 0").run();
if (!columnExists("tasks", "progress_pct"))    db.prepare("ALTER TABLE tasks ADD COLUMN progress_pct INTEGER DEFAULT 0").run();
if (!columnExists("tasks", "tags"))            db.prepare("ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT ''").run();

// resources — learning room additions (v3)
if (!columnExists("resources", "learning_notes")) db.prepare("ALTER TABLE resources ADD COLUMN learning_notes TEXT DEFAULT ''").run();
if (!columnExists("resources", "duration"))       db.prepare("ALTER TABLE resources ADD COLUMN duration TEXT DEFAULT ''").run();
if (!columnExists("resources", "thumbnail"))      db.prepare("ALTER TABLE resources ADD COLUMN thumbnail TEXT DEFAULT ''").run();
if (!columnExists("resources", "last_opened"))    db.prepare("ALTER TABLE resources ADD COLUMN last_opened TEXT").run();
if (!columnExists("resources", "watch_count"))    db.prepare("ALTER TABLE resources ADD COLUMN watch_count INTEGER DEFAULT 0").run();

// subtasks table (v2)
if (!tableExists("subtasks")) {
  db.exec(`
    CREATE TABLE subtasks (
      id          TEXT PRIMARY KEY,
      task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      is_done     INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `);
}

// users — email added in v4
if (!columnExists("users", "email")) db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();

console.log("✅ DB migrations complete");
