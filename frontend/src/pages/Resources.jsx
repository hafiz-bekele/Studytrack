import React, { useEffect, useState } from "react";
import api from "../api";

const EMPTY_FORM = { title: "", url: "", subjectId: "", type: "link" };

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/resources"), api.get("/subjects")])
      .then(([resRes, subjectsRes]) => {
        setResources(resRes.data);
        setSubjects(subjectsRes.data);
      })
      .catch(() => setError("Failed to load resources."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/resources/${editingId}`, form);
      } else {
        await api.post("/resources", form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      url: r.url,
      subjectId: r.subjectId || "",
      type: r.type || "link",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const remove = async (id) => {
    if (!confirm("Delete this resource?")) return;
    await api.delete(`/resources/${id}`);
    load();
  };

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "General";

  const typeIcon = (type) =>
    ({ link: "🔗", video: "🎬", book: "📖", pdf: "📄" }[type] || "🔗");

  if (loading) return <p className="muted">Loading resources…</p>;

  return (
    <div>
      <h1 className="page-title">Resource Library</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={submit}>
        <h2>{editingId ? "Edit Resource" : "Add Resource"}</h2>
        <div className="inline-form">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            placeholder="URL"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          <select
            value={form.subjectId}
            onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
          >
            <option value="">General</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="link">Link</option>
            <option value="video">Video</option>
            <option value="book">Book</option>
            <option value="pdf">PDF</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card-grid">
        {resources.map((r) => (
          <div className="card" key={r.id}>
            <p className="muted small">
              {subjectName(r.subjectId)} · {typeIcon(r.type)} {r.type}
            </p>
            <a href={r.url} target="_blank" rel="noreferrer">
              <strong>{r.title}</strong>
            </a>
            <div className="row-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={() => startEdit(r)}>
                Edit
              </button>
              <button className="btn btn-danger" onClick={() => remove(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {resources.length === 0 && <p className="muted">No resources added yet.</p>}
      </div>
    </div>
  );
}
