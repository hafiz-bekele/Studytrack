const { v4: uuidv4 } = require("uuid");
const db = require("./db");

function dateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function computeStreak(userId) {
  const days = db
    .prepare("SELECT DISTINCT date(date) as d FROM sessions WHERE user_id = ? ORDER BY d DESC")
    .all(userId)
    .map((r) => r.d);

  const daySet = new Set(days);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!daySet.has(dateOnly(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(dateOnly(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function totalHours(userId) {
  const row = db
    .prepare("SELECT SUM(duration_minutes) as total FROM sessions WHERE user_id = ?")
    .get(userId);
  return (row.total || 0) / 60;
}

function sessionCount(userId) {
  return db
    .prepare("SELECT COUNT(*) as n FROM sessions WHERE user_id = ?")
    .get(userId).n;
}

const BADGE_DEFS = [
  { code: "first_session",  label: "First Steps",      desc: "Logged your first study session",    check: (uid) => sessionCount(uid) >= 1 },
  { code: "streak_3",       label: "3-Day Streak",     desc: "Studied 3 days in a row",             check: (uid) => computeStreak(uid) >= 3 },
  { code: "streak_7",       label: "7-Day Streak",     desc: "Studied 7 days in a row",             check: (uid) => computeStreak(uid) >= 7 },
  { code: "streak_14",      label: "2-Week Streak",    desc: "Studied 14 days in a row",            check: (uid) => computeStreak(uid) >= 14 },
  { code: "streak_30",      label: "30-Day Streak",    desc: "Studied 30 days in a row",            check: (uid) => computeStreak(uid) >= 30 },
  { code: "hours_10",       label: "10 Hours",         desc: "Reached 10 total study hours",        check: (uid) => totalHours(uid) >= 10 },
  { code: "hours_50",       label: "50 Hours",         desc: "Reached 50 total study hours",        check: (uid) => totalHours(uid) >= 50 },
  { code: "hours_100",      label: "Century Club",     desc: "Reached 100 total study hours",       check: (uid) => totalHours(uid) >= 100 },
  { code: "hours_500",      label: "Study Legend",     desc: "Reached 500 total study hours",       check: (uid) => totalHours(uid) >= 500 },
  { code: "sessions_10",    label: "10 Sessions",      desc: "Logged 10 study sessions",            check: (uid) => sessionCount(uid) >= 10 },
  { code: "sessions_25",    label: "25 Sessions",      desc: "Logged 25 study sessions",            check: (uid) => sessionCount(uid) >= 25 },
  { code: "sessions_100",   label: "Centurion",        desc: "Logged 100 study sessions",           check: (uid) => sessionCount(uid) >= 100 },
  { code: "early_bird",     label: "Early Bird",       desc: "Logged a session before 7 AM",        check: (uid) => {
    const r = db.prepare("SELECT id FROM sessions WHERE user_id = ? AND strftime('%H', date) < '07'").get(uid);
    return !!r;
  }},
  { code: "night_owl",      label: "Night Owl",        desc: "Logged a session after 10 PM",        check: (uid) => {
    const r = db.prepare("SELECT id FROM sessions WHERE user_id = ? AND strftime('%H', date) >= '22'").get(uid);
    return !!r;
  }},
  { code: "five_subjects",  label: "Polymath",         desc: "Added 5 or more subjects",            check: (uid) => {
    const r = db.prepare("SELECT COUNT(*) as n FROM subjects WHERE user_id = ?").get(uid);
    return r.n >= 5;
  }},
];

function checkAndAwardAchievements(userId) {
  const existingCodes = new Set(
    db.prepare("SELECT code FROM achievements WHERE user_id = ?").all(userId).map((r) => r.code)
  );
  const newly = [];
  for (const badge of BADGE_DEFS) {
    if (!existingCodes.has(badge.code) && badge.check(userId)) {
      const id = uuidv4();
      db.prepare(
        "INSERT OR IGNORE INTO achievements (id, user_id, code, label, desc, earned_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, userId, badge.code, badge.label, badge.desc, new Date().toISOString());
      newly.push({ code: badge.code, label: badge.label, desc: badge.desc });
    }
  }
  return newly;
}

module.exports = { checkAndAwardAchievements, computeStreak, totalHours, BADGE_DEFS };
