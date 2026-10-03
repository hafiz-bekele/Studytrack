import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api";
import toast from "react-hot-toast";

const EMPTY_FORM = { title: "", content: "", subjectId: "", tags: "", isPinned: false };

/* ══════════════════════════════════════════════════════════════════════════
   Rich-text toolbar — wraps selected text with markdown-like syntax
══════════════════════════════════════════════════════════════════════════ */
function RichToolbar({ textareaRef, value, onChange }) {
  const wrap = (before, after = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = value.slice(start, end);
    const newVal =
      value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(newVal);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const cursor = sel.length > 0 ? start + before.length + sel.length + after.length : start + before.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const insertLine = (prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start  = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newVal = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const tools = [
    { label: "B",         title: "Bold",          style: { fontWeight: 900 }, action: () => wrap("**") },
    { label: "I",         title: "Italic",         style: { fontStyle: "italic" }, action: () => wrap("*") },
    { label: "U",         title: "Underline",      style: { textDecoration: "underline" }, action: () => wrap("<u>", "</u>") },
    { label: "S",         title: "Strikethrough",  style: { textDecoration: "line-through" }, action: () => wrap("~~") },
    { label: "H1",        title: "Heading 1",      style: {}, action: () => insertLine("# ") },
    { label: "H2",        title: "Heading 2",      style: {}, action: () => insertLine("## ") },
    { label: "H3",        title: "Heading 3",      style: {}, action: () => insertLine("### ") },
    { label: "•",         title: "Bullet list",    style: { fontSize: 18 }, action: () => insertLine("- ") },
    { label: "1.",        title: "Numbered list",  style: {}, action: () => insertLine("1. ") },
    { label: "[ ]",       title: "Checkbox",       style: { fontSize: 11 }, action: () => insertLine("- [ ] ") },
    { label: "`",         title: "Inline code",    style: { fontFamily: "monospace" }, action: () => wrap("`") },
    { label: "```",       title: "Code block",     style: { fontFamily: "monospace", fontSize: 10 }, action: () => wrap("```\n", "\n```") },
    { label: "🖊",        title: "Highlight",      style: {}, action: () => wrap("==") },
    { label: "—",         title: "Divider",        style: {}, action: () => {
      const el = textareaRef.current;
      if (!el) return;
      const p = el.selectionStart;
      onChange(value.slice(0, p) + "\n---\n" + value.slice(p));
    }},
    { label: ">",         title: "Blockquote",     style: {}, action: () => insertLine("> ") },
  ];

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 3,
      padding: "8px 10px",
      background: "var(--bg-3)",
      border: "1px solid var(--card-border)",
      borderBottom: "none",
      borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
    }}>
      {tools.map((t, i) => (
        <React.Fragment key={t.title}>
          {/* Dividers between groups */}
          {(i === 4 || i === 7 || i === 11 || i === 13) && (
            <div style={{ width: 1, background: "var(--card-border)", margin: "0 3px" }} />
          )}
          <button
            type="button"
            title={t.title}
            onClick={t.action}
            style={{
              ...t.style,
              minWidth: 28, height: 28, padding: "0 6px",
              background: "var(--card)", border: "1px solid var(--card-border)",
              borderRadius: 6, cursor: "pointer", color: "var(--text)",
              fontSize: 12, display: "flex", alignItems: "center",
              justifyContent: "center", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(108,99,255,0.2)";
              e.currentTarget.style.borderColor = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card)";
              e.currentTarget.style.borderColor = "var(--card-border)";
            }}
          >
            {t.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Markdown preview renderer (lightweight, no library needed) ─────────── */
function MarkdownPreview({ content }) {
  const html = content
    // headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    // bold italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,    "<em>$1</em>")
    // underline, strikethrough, highlight
    .replace(/<u>(.+?)<\/u>/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g,     "<del>$1</del>")
    .replace(/==(.+?)==/g,     "<mark>$1</mark>")
    // inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(108,99,255,0.15);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px">$1</code>')
    // code block
    .replace(/```[\s\S]*?```/g, (m) => `<pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;font-family:monospace;font-size:12px;overflow-x:auto">${m.slice(3, -3).trim()}</pre>`)
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--primary);padding-left:12px;color:var(--text-2);margin:4px 0">$1</blockquote>')
    // checklist
    .replace(/^- \[x\] (.+)$/gm, '<li style="list-style:none;display:flex;gap:6px;align-items:center"><span style="color:var(--success)">✅</span> <span style="text-decoration:line-through;color:var(--text-3)">$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li style="list-style:none;display:flex;gap:6px;align-items:center">☐ $1</li>')
    // bullet list
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^[0-9]+\. (.+)$/gm, "<li>$1</li>")
    // hr
    .replace(/^---$/gm, "<hr style='border:none;border-top:1px solid var(--card-border);margin:12px 0'>")
    // line breaks
    .replace(/\n/g, "<br>");

  return (
    <div
      style={{
        minHeight: 200, padding: "12px 14px",
        background: "var(--card)", border: "1px solid var(--card-border)",
        borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
        fontSize: 14, lineHeight: 1.7, color: "var(--text)",
        overflowY: "auto",
      }}
      dangerouslySetInnerHTML={{ __html: html || '<span style="color:var(--text-3)">Nothing to preview…</span>' }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Notes Page
══════════════════════════════════════════════════════════════════════════ */
export default function Notes() {
  const [notes,     setNotes]     = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [query,     setQuery]     = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editorTab, setEditorTab] = useState("write"); // write | preview
  const textareaRef               = useRef(null);

  const load = useCallback(async () => {
    try {
      const [notesRes, subjectsRes] = await Promise.all([
        api.get("/notes"), api.get("/subjects"),
      ]);
      setNotes(notesRes.data);
      setSubjects(subjectsRes.data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.content.trim()) { toast.error("Content is required"); return; }

    setSaving(true);
    try {
      // Build payload — backend columns: title, content, subject_id, tags, is_pinned
      const payload = {
        title:     form.title.trim(),
        content:   form.content,
        subjectId: form.subjectId || null,
        tags:      form.tags || "",
        isPinned:  form.isPinned ? 1 : 0,
      };

      if (editingId) {
        await api.put(`/notes/${editingId}`, payload);
        toast.success("Note updated ✓");
      } else {
        await api.post("/notes", payload);
        toast.success("Note saved ✓");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (n) => {
    setEditingId(n.id);
    setForm({
      title:     n.title,
      content:   n.content,
      subjectId: n.subjectId || "",
      tags:      n.tags      || "",
      isPinned:  !!n.isPinned,
    });
    setEditorTab("write");
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEditorTab("write");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const togglePin = async (n) => {
    try {
      await api.put(`/notes/${n.id}`, { isPinned: n.isPinned ? 0 : 1 });
      load();
    } catch { toast.error("Failed to update note"); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      toast.success("Note deleted");
      load();
    } catch { toast.error("Failed to delete note"); }
  };

  const subjectName  = (id) => subjects.find((s) => s.id === id)?.name  || "General";
  const subjectColor = (id) => subjects.find((s) => s.id === id)?.color || "var(--primary)";

  const visible = [...notes]
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
    .filter((n) => {
      if (filterSub && n.subjectId !== filterSub) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags || "").toLowerCase().includes(q)
      );
    });

  if (loading) return (
    <div className="loading-center animate-in">
      <div className="spinner" /><span>Loading notes…</span>
    </div>
  );

  return (
    <div className="animate-in">
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">📝 Notes</h1>
          <p className="page-sub">
            {notes.length} note{notes.length !== 1 ? "s" : ""} ·{" "}
            {notes.filter((n) => n.isPinned).length} pinned
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>✚ New Note</button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="search-input"
          placeholder="🔍 Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 180, margin: 0 }}
        />
        <select
          value={filterSub}
          onChange={(e) => setFilterSub(e.target.value)}
          style={{ width: "auto", padding: "7px 12px" }}
        >
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* ── Empty state ── */}
      {notes.length === 0 && (
        <div style={{
          textAlign: "center", padding: "64px 24px",
          border: "2px dashed var(--card-border)", borderRadius: "var(--radius)",
          color: "var(--text-3)",
        }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>📝</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No notes yet</div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Capture ideas, summaries and key concepts</p>
          <button className="btn btn-primary" onClick={openAdd}>✚ Write your first note</button>
        </div>
      )}

      {/* ── Notes grid ── */}
      <div className="card-grid">
        {visible.map((n) => (
          <div
            key={n.id}
            style={{
              background: "var(--card)", border: "1px solid var(--card-border)",
              borderTop: `3px solid ${subjectColor(n.subjectId)}`,
              borderRadius: "var(--radius)", padding: 16,
              transition: "var(--transition)", position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "var(--shadow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            {n.isPinned && (
              <div style={{ position: "absolute", top: 6, right: 12, fontSize: 14 }}>📌</div>
            )}

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6,
                         paddingRight: n.isPinned ? 24 : 0 }}>
              {n.title}
            </h3>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                background: `${subjectColor(n.subjectId)}22`,
                color: subjectColor(n.subjectId),
                border: `1px solid ${subjectColor(n.subjectId)}44`,
              }}>
                {subjectName(n.subjectId)}
              </span>
              {n.tags && n.tags.split(",").filter(Boolean).map((t) => (
                <span key={t} className="tag tag-purple">{t.trim()}</span>
              ))}
            </div>

            {/* Preview — strip markdown symbols for clean preview */}
            <p style={{
              fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10,
              display: "-webkit-box", WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {n.content
                .replace(/^#{1,3} /gm, "")
                .replace(/\*\*|__|\*|_|~~|==|`/g, "")
                .replace(/^[-*>] /gm, "")
                .trim()
              }
            </p>

            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 10 }}>
              {new Date(n.updatedAt || n.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </div>

            <div className="row-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => togglePin(n)}
                title={n.isPinned ? "Unpin" : "Pin"}
              >
                {n.isPinned ? "Unpin" : "📌 Pin"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(n)}>✏ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(n.id)}>🗑</button>
            </div>
          </div>
        ))}
        {visible.length === 0 && notes.length > 0 && (
          <p className="muted">No notes match your search.</p>
        )}
      </div>

      {/* ══ Modal ══ */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            zIndex: 300, display: "flex", alignItems: "center",
            justifyContent: "center", padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: "var(--bg-2)", border: "1px solid var(--card-border)",
              borderRadius: "var(--radius-lg)", padding: 28,
              width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto",
              boxShadow: "var(--shadow-lg)", animation: "scaleIn 0.2s ease",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                {editingId ? "✏ Edit Note" : "✚ New Note"}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={submit}>
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  placeholder="Note title…"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* Subject + Tags */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  >
                    <option value="">General</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input
                    placeholder="e.g. exam, chapter-3"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
              </div>

              {/* Editor */}
              <div className="form-group" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center",
                              justifyContent: "space-between", marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Content *</label>
                  {/* Write / Preview tabs */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {["write", "preview"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditorTab(t)}
                        style={{
                          padding: "4px 12px", borderRadius: 6, border: "1px solid",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: editorTab === t ? "var(--primary)" : "var(--card)",
                          borderColor: editorTab === t ? "var(--primary)" : "var(--card-border)",
                          color: editorTab === t ? "white" : "var(--text-2)",
                          textTransform: "capitalize",
                        }}
                      >
                        {t === "write" ? "✏ Write" : "👁 Preview"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toolbar */}
                <RichToolbar
                  textareaRef={textareaRef}
                  value={form.content}
                  onChange={(val) => setForm({ ...form, content: val })}
                />

                {/* Editor / Preview */}
                {editorTab === "write" ? (
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    placeholder={"Write your note here…\n\nTips:\n• **bold**, *italic*, ~~strikethrough~~\n• # Heading 1, ## Heading 2\n• - Bullet list item\n• - [ ] Checkbox item\n• `inline code`\n• > Blockquote"}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    style={{
                      borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                      resize: "vertical", minHeight: 220, fontFamily: "monospace",
                      fontSize: 13, lineHeight: 1.7,
                    }}
                  />
                ) : (
                  <MarkdownPreview content={form.content} />
                )}
              </div>

              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center",
                            justifyContent: "space-between", marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8,
                                cursor: "pointer", fontSize: 13, color: "var(--text-2)" }}>
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    style={{ width: "auto", margin: 0 }}
                  />
                  📌 Pin this note
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : editingId ? "Update Note" : "Save Note"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
