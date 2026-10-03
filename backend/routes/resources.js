const express = require("express");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const db     = require("../utils/db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

/* ── YouTube ID extractor ─────────────────────────────────────────────────
   Must be declared BEFORE any route that calls it.
────────────────────────────────────────────────────────────────────────── */
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ── toClient helper ──────────────────────────────────────────────────────── */
function toClient(r) {
  if (!r) return null;
  return {
    id:            r.id,
    userId:        r.user_id,
    subjectId:     r.subject_id,
    title:         r.title,
    url:           r.url,
    type:          r.type,
    isFavorite:    !!r.is_favorite,
    learningNotes: r.learning_notes || "",
    duration:      r.duration       || "",
    thumbnail:     r.thumbnail      || "",
    lastOpened:    r.last_opened    || null,
    watchCount:    r.watch_count    || 0,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  };
}

/* ── Multer upload config ─────────────────────────────────────────────────── */
const UPLOAD_DIR = path.join(__dirname, "..", "data", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req,  file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext    = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME = [
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "text/plain",
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   ROUTES — fixed-path routes MUST come before /:id
══════════════════════════════════════════════════════════════════════════ */

/* ── GET /meta/stats  (MUST be before GET /:id) ─────────────────────────── */
router.get("/meta/stats", (req, res) => {
  const uid = req.userId;
  const total = db.prepare("SELECT COUNT(*) as n FROM resources WHERE user_id = ?").get(uid).n;
  const favs  = db.prepare("SELECT COUNT(*) as n FROM resources WHERE user_id = ? AND is_favorite = 1").get(uid).n;
  const byType = db.prepare(
    "SELECT type, COUNT(*) as count FROM resources WHERE user_id = ? GROUP BY type"
  ).all(uid);
  const recent = db.prepare(
    "SELECT * FROM resources WHERE user_id = ? AND last_opened IS NOT NULL ORDER BY last_opened DESC LIMIT 5"
  ).all(uid).map(toClient);
  const mostWatched = db.prepare(
    "SELECT * FROM resources WHERE user_id = ? AND watch_count > 0 ORDER BY watch_count DESC LIMIT 5"
  ).all(uid).map(toClient);

  res.json({ total, favorites: favs, byType, recent, mostWatched });
});

/* ── POST /upload  (MUST be before /:id routes) ─────────────────────────── */
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { subjectId, learningNotes, duration } = req.body;
  const fileUrl = `/uploads/${req.file.filename}`;
  const title   = (req.body.title || "").trim() || req.file.originalname;
  const ext     = path.extname(req.file.originalname).toLowerCase();
  const type    = ext === ".pdf" ? "pdf" : "link";

  const id  = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO resources
      (id, user_id, subject_id, title, url, type, is_favorite,
       learning_notes, duration, thumbnail, watch_count, created_at, updated_at)
    VALUES (?,?,?,?,?,?,0,?,?,?,0,?,?)
  `).run(
    id, req.userId, subjectId || null,
    title, fileUrl, type,
    learningNotes || "", duration || "", "", now, now
  );

  res.status(201).json(toClient(db.prepare("SELECT * FROM resources WHERE id = ?").get(id)));
});

/* ── Multer error handler ─────────────────────────────────────────────────── */
router.use((err, req, res, next) => {
  if (err && err.message) return res.status(400).json({ error: err.message });
  next(err);
});

/* ── GET / ───────────────────────────────────────────────────────────────── */
router.get("/", (req, res) => {
  const { subjectId, type, search, favorites } = req.query;
  let sql = "SELECT * FROM resources WHERE user_id = ?";
  const params = [req.userId];
  if (subjectId)       { sql += " AND subject_id = ?";   params.push(subjectId); }
  if (type)            { sql += " AND type = ?";          params.push(type); }
  if (favorites === "1") { sql += " AND is_favorite = 1"; }
  if (search)          { sql += " AND title LIKE ?";      params.push(`%${search}%`); }
  sql += " ORDER BY created_at DESC";
  res.json(db.prepare(sql).all(...params).map(toClient));
});

/* ── GET /:id ────────────────────────────────────────────────────────────── */
router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM resources WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(toClient(row));
});

/* ── POST / ──────────────────────────────────────────────────────────────── */
router.post("/", (req, res) => {
  const { title, url, subjectId, type, isFavorite, learningNotes, duration } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
  if (!url   || !url.trim())   return res.status(400).json({ error: "url is required" });

  const id    = uuidv4();
  const now   = new Date().toISOString();
  const ytId  = extractYouTubeId(url);
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : "";

  db.prepare(`
    INSERT INTO resources
      (id, user_id, subject_id, title, url, type, is_favorite,
       learning_notes, duration, thumbnail, watch_count, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)
  `).run(
    id, req.userId, subjectId || null,
    title.trim(), url.trim(),
    type || "link", isFavorite ? 1 : 0,
    learningNotes || "", duration || "", thumb, now, now
  );

  res.status(201).json(toClient(db.prepare("SELECT * FROM resources WHERE id = ?").get(id)));
});

/* ── PUT /:id ────────────────────────────────────────────────────────────── */
router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM resources WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const { title, url, subjectId, type, isFavorite, learningNotes, duration } = req.body;
  const newUrl = url ?? existing.url;
  const ytId   = extractYouTubeId(newUrl);
  const thumb  = ytId
    ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
    : (existing.thumbnail || "");

  db.prepare(`
    UPDATE resources SET
      title = ?, url = ?, subject_id = ?, type = ?, is_favorite = ?,
      learning_notes = ?, duration = ?, thumbnail = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    title         ?? existing.title,
    newUrl,
    subjectId !== undefined ? (subjectId || null) : existing.subject_id,
    type          ?? existing.type,
    isFavorite !== undefined ? (isFavorite ? 1 : 0) : existing.is_favorite,
    learningNotes ?? existing.learning_notes,
    duration      ?? existing.duration,
    thumb,
    new Date().toISOString(),
    req.params.id, req.userId
  );

  res.json(toClient(db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id)));
});

/* ── DELETE /:id ─────────────────────────────────────────────────────────── */
router.delete("/:id", (req, res) => {
  // Also delete the physical file if it was an upload
  const row = db
    .prepare("SELECT url FROM resources WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Not found" });

  if (row.url && row.url.startsWith("/uploads/")) {
    const filePath = path.join(UPLOAD_DIR, path.basename(row.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare("DELETE FROM resources WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId);
  res.json({ success: true });
});

/* ── PATCH /:id/notes ────────────────────────────────────────────────────── */
router.patch("/:id/notes", (req, res) => {
  const existing = db
    .prepare("SELECT id FROM resources WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  db.prepare(
    "UPDATE resources SET learning_notes = ?, updated_at = ? WHERE id = ? AND user_id = ?"
  ).run(req.body.learningNotes || "", new Date().toISOString(), req.params.id, req.userId);

  res.json(toClient(db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id)));
});

/* ── POST /:id/open ──────────────────────────────────────────────────────── */
router.post("/:id/open", (req, res) => {
  const existing = db
    .prepare("SELECT id FROM resources WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Not found" });

  db.prepare(
    "UPDATE resources SET watch_count = watch_count + 1, last_opened = ? WHERE id = ? AND user_id = ?"
  ).run(new Date().toISOString(), req.params.id, req.userId);

  res.json({ success: true });
});

/* ── POST /:id/favorite ──────────────────────────────────────────────────── */
router.post("/:id/favorite", (req, res) => {
  const row = db
    .prepare("SELECT * FROM resources WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Not found" });

  const newFav = row.is_favorite ? 0 : 1;
  db.prepare("UPDATE resources SET is_favorite = ? WHERE id = ?").run(newFav, req.params.id);
  res.json({ isFavorite: !!newFav });
});

module.exports = router;
module.exports.extractYouTubeId = extractYouTubeId;
