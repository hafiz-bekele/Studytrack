import React, { useEffect, useState, useCallback, useRef } from "react";
import api, { uploadFile } from "../api";
import toast from "react-hot-toast";

/* ── YouTube ID extractor (mirrors backend) ─────────────────────────────── */
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

function isYouTube(url) { return !!extractYouTubeId(url); }
function isEmbeddable(url) {
  if (!url) return false;
  if (isYouTube(url)) return true;
  // Local uploads served by the backend
  if (url.startsWith("/uploads/")) return true;
  // PDF, Google Docs, Slides, Drive
  return /\.(pdf)$/i.test(url) ||
    url.includes("docs.google.com") ||
    url.includes("slides.google.com") ||
    url.includes("drive.google.com");
}

/* ── Type metadata ──────────────────────────────────────────────────────── */
const TYPE_META = {
  video:   { icon: "🎬", label: "Video",   color: "#ef4444" },
  youtube: { icon: "▶️",  label: "YouTube", color: "#ff0000" },
  link:    { icon: "🔗", label: "Link",    color: "#6c63ff" },
  pdf:     { icon: "📄", label: "PDF",     color: "#f59e0b" },
  book:    { icon: "📖", label: "Book",    color: "#059669" },
  article: { icon: "📰", label: "Article", color: "#0891b2" },
  course:  { icon: "🎓", label: "Course",  color: "#9333ea" },
  tool:    { icon: "🔧", label: "Tool",    color: "#64748b" },
};
const ALL_TYPES = Object.keys(TYPE_META);

function typeMeta(t) { return TYPE_META[t] || TYPE_META.link; }

const EMPTY_FORM = {
  title: "", url: "", subjectId: "", type: "link",
  duration: "", learningNotes: "",
};

/* ── Notes auto-save debounce ───────────────────────────────────────────── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ══════════════════════════════════════════════════════════════════════════
   Viewer Panel — YouTube embed or iframe or external link
══════════════════════════════════════════════════════════════════════════ */
function ViewerPanel({ resource, onClose, onNotesSaved }) {
  const [notes, setNotes]       = useState(resource.learningNotes || "");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const debouncedNotes          = useDebounce(notes, 1200);
  const alreadySavedRef         = useRef(false);

  // Record open on mount
  useEffect(() => {
    api.post(`/resources/${resource.id}/open`).catch(() => {});
  }, [resource.id]);

  // Auto-save notes when debounced value changes
  useEffect(() => {
    if (debouncedNotes === (resource.learningNotes || "")) return;
    if (alreadySavedRef.current) return;
    alreadySavedRef.current = true;
    setSaving(true);
    api.patch(`/resources/${resource.id}/notes`, { learningNotes: debouncedNotes })
      .then(() => {
        setSaved(true);
        onNotesSaved(resource.id, debouncedNotes);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => toast.error("Failed to save notes"))
      .finally(() => {
        setSaving(false);
        alreadySavedRef.current = false;
      });
  }, [debouncedNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  const ytId = extractYouTubeId(resource.url);
  const embeddable = isEmbeddable(resource.url);
  const tm = typeMeta(resource.type);
  // Local uploaded files need to point at the backend in dev (proxy handles /api but not /uploads)
  const iframeUrl = resource.url.startsWith("/uploads/")
    ? `http://localhost:5000${resource.url}`
    : resource.url;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column",
      animation: "fadeIn 0.2s ease",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
        background: "var(--bg-2)", borderBottom: "1px solid var(--card-border)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 20 }}>{tm.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {resource.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>{resource.url}</div>
        </div>

        {/* Open in new tab */}
        <a href={resource.url.startsWith("/uploads/") ? `http://localhost:5000${resource.url}` : resource.url}
          target="_blank" rel="noreferrer"
          className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
          ↗ Open tab
        </a>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>
          ✕ Close
        </button>
      </div>

      {/* ── Main area: viewer + notes side by side ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Video / iframe / placeholder */}
        <div style={{
          flex: 1, background: "#000",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {ytId ? (
            /* YouTube embed */
            <iframe
              key={ytId}
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : embeddable ? (
            /* Generic iframe for local PDFs, Google Docs, etc. */
            <iframe
              key={iframeUrl}
              src={iframeUrl}
              title={resource.title}
              style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
            />
          ) : (
            /* Non-embeddable: show card with open button */
            <div style={{ textAlign: "center", color: "#fff", padding: 40 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{tm.icon}</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{resource.title}</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24, maxWidth: 400 }}>
                This resource can't be embedded directly.<br />Click below to open it in a new tab.
              </p>
              <a href={resource.url} target="_blank" rel="noreferrer"
                className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
                ↗ Open {tm.label}
              </a>
            </div>
          )}
        </div>

        {/* Right: Notes panel */}
        <div style={{
          width: 320, flexShrink: 0,
          background: "var(--bg-2)", borderLeft: "1px solid var(--card-border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--card-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>📝 Study Notes</span>
            <span style={{ fontSize: 11, color: saving ? "var(--warning)" :
                                                  saved  ? "var(--success)" : "var(--text-3)" }}>
              {saving ? "Saving…" : saved ? "✓ Saved" : "Auto-saves"}
            </span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              ytId
                ? "Take notes while watching…\n\n• Key points\n• Timestamps (e.g. 3:22 - concept)\n• Questions\n• Summary"
                : "Add your notes here…\n\n• Key takeaways\n• Important quotes\n• Questions\n• Action items"
            }
            style={{
              flex: 1, resize: "none", border: "none", outline: "none",
              background: "transparent", color: "var(--text)", fontSize: 13,
              lineHeight: 1.7, padding: "14px 16px", fontFamily: "inherit",
            }}
          />

          {/* Resource meta */}
          <div style={{
            padding: "12px 16px", borderTop: "1px solid var(--card-border)",
            fontSize: 11, color: "var(--text-3)",
          }}>
            {resource.duration && <div>⏱ Duration: {resource.duration}</div>}
            <div>👁 Opened {(resource.watchCount || 0) + 1} time{(resource.watchCount || 0) + 1 !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Resource Card
══════════════════════════════════════════════════════════════════════════ */
function ResourceCard({ resource, subjects, onOpen, onEdit, onDelete, onToggleFav }) {
  const tm = typeMeta(resource.type);
  const ytId = extractYouTubeId(resource.url);
  const subjectName = subjects.find((s) => s.id === resource.subjectId)?.name;
  const subjectColor = subjects.find((s) => s.id === resource.subjectId)?.color || "var(--primary)";

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--card-border)",
      borderRadius: "var(--radius)", overflow: "hidden",
      transition: "var(--transition)", display: "flex", flexDirection: "column",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow)"; e.currentTarget.style.borderColor = "rgba(108,99,255,0.35)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "var(--card-border)"; }}
    >
      {/* Thumbnail / type banner */}
      <div style={{
        position: "relative", height: 130, overflow: "hidden",
        background: ytId && resource.thumbnail
          ? `url(${resource.thumbnail}) center/cover no-repeat`
          : `linear-gradient(135deg, ${tm.color}22, ${tm.color}11)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }} onClick={() => onOpen(resource)}>

        {/* Play overlay for YouTube */}
        {ytId ? (
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center",
            border: "3px solid rgba(255,255,255,0.8)",
            transition: "transform 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = ""}
          >
            <span style={{ fontSize: 20, marginLeft: 4 }}>▶</span>
          </div>
        ) : (
          <span style={{ fontSize: 44 }}>{tm.icon}</span>
        )}

        {/* Type badge */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: `${tm.color}dd`, color: "#fff",
          padding: "3px 9px", borderRadius: 99,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}>{tm.label}</div>

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(resource); }}
          style={{
            position: "absolute", top: 6, right: 8,
            background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer",
            borderRadius: "50%", width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, transition: "transform 0.2s",
          }}
          title={resource.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {resource.isFavorite ? "❤️" : "🤍"}
        </button>

        {/* Notes indicator */}
        {resource.learningNotes && (
          <div style={{
            position: "absolute", bottom: 6, right: 8,
            background: "rgba(108,99,255,0.85)", color: "#fff",
            padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700,
          }}>📝 Notes</div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {resource.title}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {subjectName && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
              background: `${subjectColor}22`, color: subjectColor,
              border: `1px solid ${subjectColor}44`,
            }}>{subjectName}</span>
          )}
          {resource.duration && (
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>⏱ {resource.duration}</span>
          )}
          {resource.watchCount > 0 && (
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>👁 {resource.watchCount}×</span>
          )}
        </div>

        {resource.lastOpened && (
          <div style={{ fontSize: 10, color: "var(--text-3)" }}>
            Last opened: {new Date(resource.lastOpened).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 14px 12px",
        borderTop: "1px solid var(--card-border)",
      }}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onOpen(resource)}
        >
          {ytId ? "▶ Watch" : isEmbeddable(resource.url) ? "📖 Open" : "↗ Open"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(resource)}>✏</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(resource.id, resource.title)}>🗑</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Add / Edit Modal  (URL tab + Upload tab)
══════════════════════════════════════════════════════════════════════════ */
function ResourceModal({ form, setForm, subjects, onSubmit, onClose, editingId, saving,
                         onUploadDone }) {
  const [tab, setTab]               = useState("url");     // "url" | "upload"
  const [dragOver, setDragOver]     = useState(false);
  const [uploadFile_, setUploadFile_] = useState(null);    // File object
  const [uploadMeta, setUploadMeta] = useState({ title: "", subjectId: "", learningNotes: "" });
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const fileInputRef                = useRef(null);

  const ytId = extractYouTubeId(form.url);

  // Auto-detect type from URL
  const handleUrlChange = (url) => {
    let autoType = form.type;
    if (extractYouTubeId(url))           autoType = "video";
    else if (/\.(pdf)$/i.test(url))      autoType = "pdf";
    else if (url.includes("coursera") ||
             url.includes("udemy")   ||
             url.includes("edx"))        autoType = "course";
    setForm({ ...form, url, type: autoType });
  };

  // Handle file selection (input or drag-drop)
  const handleFileChosen = (file) => {
    if (!file) return;
    setUploadFile_(file);
    if (!uploadMeta.title) {
      // Strip extension for a clean default title
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setUploadMeta((m) => ({ ...m, title: name }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChosen(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile_) { toast.error("Please choose a file first"); return; }
    setUploading(true);
    setUploadPct(0);
    try {
      const res = await uploadFile(uploadFile_, uploadMeta, setUploadPct);
      toast.success(`📄 "${res.data.title}" uploaded!`);
      onUploadDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const ALLOWED_EXT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 300, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--card-border)",
        borderRadius: "var(--radius-lg)", padding: 28, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "var(--shadow-lg)", animation: "scaleIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>
            {editingId ? "✏ Edit Resource" : "✚ Add Resource"}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Tabs (only show when adding new) */}
        {!editingId && (
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab ${tab === "url" ? "active" : ""}`}
              onClick={() => setTab("url")}>🔗 URL / Link</button>
            <button className={`tab ${tab === "upload" ? "active" : ""}`}
              onClick={() => setTab("upload")}>📎 Upload from device</button>
          </div>
        )}

        {/* ── URL tab ── */}
        {(tab === "url" || editingId) && (
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">URL / Link *</label>
              <input
                placeholder="https://youtube.com/watch?v=… or any URL"
                value={form.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required autoFocus
              />
              {ytId && (
                <div style={{
                  marginTop: 8, borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--card-border)",
                  display: "flex", alignItems: "center",
                  background: "rgba(255,0,0,0.08)", gap: 10, padding: 8,
                }}>
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="thumb"
                    style={{ width: 80, borderRadius: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#ff4444" }}>
                      ▶ YouTube video detected
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                      Will be embedded directly in the Learning Room
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input placeholder="Give this resource a name"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {ALL_TYPES.map((t) => (
                    <option key={t} value={t}>{typeMeta(t).icon} {typeMeta(t).label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (optional)</label>
                <input placeholder="e.g. 12:34 or 2h 15m"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <select value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">General / No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial notes (optional)</label>
              <textarea rows={3}
                placeholder="Why are you saving this? What do you want to learn from it?"
                value={form.learningNotes}
                onChange={(e) => setForm({ ...form, learningNotes: e.target.value })} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update" : "Add to Library"}
              </button>
            </div>
          </form>
        )}

        {/* ── Upload tab ── */}
        {tab === "upload" && !editingId && (
          <form onSubmit={handleUploadSubmit}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--primary)" : uploadFile_ ? "var(--success)" : "var(--card-border)"}`,
                borderRadius: "var(--radius)",
                padding: "36px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(108,99,255,0.07)" : "var(--card)",
                transition: "var(--transition)",
                marginBottom: 16,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXT}
                style={{ display: "none" }}
                onChange={(e) => handleFileChosen(e.target.files[0])}
              />

              {uploadFile_ ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>
                    {uploadFile_.name.endsWith(".pdf") ? "📄" : "🖼️"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--success)" }}>
                    {uploadFile_.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    {(uploadFile_.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
                    Click to choose a different file
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📎</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                    Drop your file here
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>
                    or click to browse
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    PDF, PNG, JPG, GIF, WEBP, TXT · max 50 MB
                  </div>
                </>
              )}
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input placeholder="Auto-filled from filename"
                value={uploadMeta.title}
                onChange={(e) => setUploadMeta({ ...uploadMeta, title: e.target.value })} />
            </div>

            {/* Subject */}
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select value={uploadMeta.subjectId}
                onChange={(e) => setUploadMeta({ ...uploadMeta, subjectId: e.target.value })}>
                <option value="">General / No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea rows={2} placeholder="Add some initial notes about this file…"
                value={uploadMeta.learningNotes}
                onChange={(e) => setUploadMeta({ ...uploadMeta, learningNotes: e.target.value })} />
            </div>

            {/* Upload progress bar */}
            {uploading && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                              fontSize: 12, color: "var(--text-2)", marginBottom: 5 }}>
                  <span>Uploading…</span><span>{uploadPct}%</span>
                </div>
                <div style={{ background: "var(--card)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                  <div style={{
                    width: `${uploadPct}%`, height: "100%",
                    background: "linear-gradient(90deg, var(--primary), var(--primary-light))",
                    borderRadius: 999, transition: "width 0.2s ease",
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary"
                disabled={uploading || !uploadFile_}>
                {uploading ? `Uploading ${uploadPct}%…` : "📤 Upload & Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════════════════ */
export default function LearningRoom() {
  const [resources,  setResources]  = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  // Viewer
  const [viewing,    setViewing]    = useState(null);

  // Modal
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  // Filters
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("all");
  const [filterSubject,setFilterSubject]= useState("");
  const [filterFavs,   setFilterFavs]   = useState(false);
  const [viewMode,     setViewMode]     = useState("grid"); // grid | list

  /* ── load ──────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const [resRes, subRes, statsRes] = await Promise.all([
        api.get("/resources"),
        api.get("/subjects"),
        api.get("/resources/meta/stats"),
      ]);
      setResources(resRes.data);
      setSubjects(subRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load learning room");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── filtering ─────────────────────────────────────────────────────────── */
  const visible = resources.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterSubject && r.subjectId !== filterSubject) return false;
    if (filterFavs && !r.isFavorite) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* ── modal helpers ─────────────────────────────────────────────────────── */
  const openAdd = () => {
    setEditingId(null); setForm(EMPTY_FORM); setShowModal(true);
  };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({
      title:         r.title,
      url:           r.url,
      subjectId:     r.subjectId   || "",
      type:          r.type        || "link",
      duration:      r.duration    || "",
      learningNotes: r.learningNotes || "",
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); };

  /* ── submit ────────────────────────────────────────────────────────────── */
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, subjectId: form.subjectId || null };
    try {
      if (editingId) {
        await api.put(`/resources/${editingId}`, payload);
        toast.success("Resource updated ✓");
      } else {
        await api.post("/resources", payload);
        toast.success("Resource added to library ✓");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ────────────────────────────────────────────────────────────── */
  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/resources/${id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  };

  /* ── favorite ──────────────────────────────────────────────────────────── */
  const handleToggleFav = async (r) => {
    try {
      const res = await api.post(`/resources/${r.id}/favorite`);
      setResources((prev) =>
        prev.map((x) => x.id === r.id ? { ...x, isFavorite: res.data.isFavorite } : x)
      );
    } catch { toast.error("Failed to update favorite"); }
  };

  /* ── notes saved callback (update local state) ─────────────────────────── */
  const handleNotesSaved = (id, notes) => {
    setResources((prev) =>
      prev.map((r) => r.id === id ? { ...r, learningNotes: notes } : r)
    );
  };

  /* ── open viewer ───────────────────────────────────────────────────────── */
  const handleOpen = (resource) => {
    setViewing(resource);
  };

  /* ── active resource in viewer (keep notes in sync) ────────────────────── */
  const viewingResource = viewing
    ? resources.find((r) => r.id === viewing.id) || viewing
    : null;

  if (loading) return (
    <div className="loading-center animate-in">
      <div className="spinner" />
      <span>Loading learning room…</span>
    </div>
  );

  return (
    <>
      {/* ── Viewer overlay ── */}
      {viewingResource && (
        <ViewerPanel
          resource={viewingResource}
          onClose={() => setViewing(null)}
          onNotesSaved={handleNotesSaved}
        />
      )}

      <div className="animate-in">
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", marginBottom: 20,
                      flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">🎓 Learning Room</h1>
            <p className="page-sub">
              All your study links, YouTube videos, PDFs and courses in one place
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            ✚ Add Resource
          </button>
        </div>

        {/* ── Stats row ── */}
        {stats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10, marginBottom: 20,
          }}>
            {[
              { icon: "📚", label: "Total",      value: stats.total,     color: "var(--primary)" },
              { icon: "❤️", label: "Favorites",  value: stats.favorites, color: "var(--danger)" },
              ...(stats.byType || []).map((t) => ({
                icon: typeMeta(t.type).icon,
                label: typeMeta(t.type).label,
                value: t.count,
                color: typeMeta(t.type).color,
              })),
            ].map((s) => (
              <div key={s.label} style={{
                background: "var(--card)", border: "1px solid var(--card-border)",
                borderRadius: "var(--radius)", padding: "12px 14px",
                borderTop: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color,
                              letterSpacing: "-1px" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2,
                              textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Recently opened ── */}
        {stats?.recent?.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>🕐 Recently Opened</h2>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {stats.recent.map((r) => {
                const ytId = extractYouTubeId(r.url);
                const tm = typeMeta(r.type);
                return (
                  <div key={r.id}
                    onClick={() => handleOpen(r)}
                    style={{
                      flexShrink: 0, width: 140, cursor: "pointer",
                      background: "var(--bg-3)", border: "1px solid var(--card-border)",
                      borderRadius: "var(--radius-sm)", overflow: "hidden",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--card-border)"}
                  >
                    <div style={{
                      height: 70, overflow: "hidden",
                      background: ytId && r.thumbnail
                        ? `url(${r.thumbnail}) center/cover no-repeat`
                        : `${tm.color}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {!ytId && <span style={{ fontSize: 28 }}>{tm.icon}</span>}
                    </div>
                    <div style={{ padding: "6px 8px", fontSize: 11, fontWeight: 600,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="search-input"
            placeholder="🔍 Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, margin: 0 }}
          />

          {/* Type filter */}
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}>All</button>
            {ALL_TYPES.map((t) => (
              resources.some((r) => r.type === t) && (
                <button key={t}
                  className={`tab ${filterType === t ? "active" : ""}`}
                  onClick={() => setFilterType(t)}>
                  {typeMeta(t).icon}
                </button>
              )
            ))}
          </div>

          {/* Subject filter */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{ width: "auto", padding: "7px 12px" }}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Favorites toggle */}
          <button
            className={`btn ${filterFavs ? "btn-secondary" : "btn-ghost"} btn-sm`}
            onClick={() => setFilterFavs((f) => !f)}
          >
            {filterFavs ? "❤️ Favorites" : "🤍 Favorites"}
          </button>

          {/* Grid / list toggle */}
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}>⊞ Grid</button>
            <button className={`tab ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
          </div>
        </div>

        {/* ── Result count ── */}
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
          Showing {visible.length} of {resources.length} resource{resources.length !== 1 ? "s" : ""}
          {filterFavs ? " (favorites)" : ""}
        </div>

        {/* ── Empty state ── */}
        {resources.length === 0 && (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            border: "2px dashed var(--card-border)", borderRadius: "var(--radius)",
            color: "var(--text-3)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🎓</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Your learning room is empty
            </div>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              Paste any YouTube link, website, PDF or course URL to get started
            </p>
            <button className="btn btn-primary" onClick={openAdd}>
              ✚ Add your first resource
            </button>
          </div>
        )}

        {visible.length === 0 && resources.length > 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-3)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            No resources match your filters.
          </div>
        )}

        {/* ── Grid view ── */}
        {viewMode === "grid" && visible.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}>
            {visible.map((r) => (
              <ResourceCard
                key={r.id} resource={r} subjects={subjects}
                onOpen={handleOpen} onEdit={openEdit}
                onDelete={handleDelete} onToggleFav={handleToggleFav}
              />
            ))}
          </div>
        )}

        {/* ── List view ── */}
        {viewMode === "list" && visible.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((r) => {
              const tm = typeMeta(r.type);
              const ytId = extractYouTubeId(r.url);
              const subjectName = subjects.find((s) => s.id === r.subjectId)?.name;
              return (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--card)", border: "1px solid var(--card-border)",
                  borderRadius: "var(--radius)", padding: "12px 16px",
                  transition: "var(--transition)", cursor: "default",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(108,99,255,0.35)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--card-border)"}
                >
                  {/* Thumb */}
                  <div style={{
                    width: 60, height: 42, flexShrink: 0,
                    borderRadius: "var(--radius-sm)", overflow: "hidden",
                    background: ytId && r.thumbnail
                      ? `url(${r.thumbnail}) center/cover no-repeat`
                      : `${tm.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!ytId && <span style={{ fontSize: 20 }}>{tm.icon}</span>}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2,
                                  display: "flex", gap: 10 }}>
                      <span style={{ color: tm.color }}>{tm.icon} {tm.label}</span>
                      {subjectName && <span>📚 {subjectName}</span>}
                      {r.duration && <span>⏱ {r.duration}</span>}
                      {r.watchCount > 0 && <span>👁 {r.watchCount}×</span>}
                      {r.learningNotes && <span style={{ color: "var(--primary-light)" }}>📝 Notes</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleToggleFav(r)}
                    >{r.isFavorite ? "❤️" : "🤍"}</button>
                    <button className="btn btn-primary btn-sm"
                      onClick={() => handleOpen(r)}>
                      {ytId ? "▶" : "↗"} Open
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>✏</button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(r.id, r.title)}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <ResourceModal
          form={form} setForm={setForm} subjects={subjects}
          onSubmit={submit} onClose={closeModal}
          editingId={editingId} saving={saving}
          onUploadDone={load}
        />
      )}
    </>
  );
}
