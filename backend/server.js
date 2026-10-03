require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

// Run DB migrations before anything else
require("./utils/migrate");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files (PDFs, images etc.)
app.use("/uploads", express.static(path.join(__dirname, "data", "uploads")));

// ── API routes ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString(), db: "sqlite" })
);

app.use("/api/auth",         require("./routes/auth"));
app.use("/api/me",           require("./routes/me"));
app.use("/api/subjects",     require("./routes/subjects"));
app.use("/api/tasks",        require("./routes/tasks"));
app.use("/api/sessions",     require("./routes/sessions"));
app.use("/api/notes",        require("./routes/notes"));
app.use("/api/flashcards",   require("./routes/flashcards"));
app.use("/api/goals",        require("./routes/goals"));
app.use("/api/resources",    require("./routes/resources"));
app.use("/api/plan",         require("./routes/plan"));
app.use("/api/progress",     require("./routes/progress"));
app.use("/api/achievements", require("./routes/achievements"));
app.use("/api/stats",        require("./routes/stats"));

// ── Serve React frontend in production ─────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, "public");
const fs = require("fs");

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  // React Router — serve index.html for all non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
}

// ── Error handlers ──────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`StudyTrack running on http://localhost:${PORT}`)
);
