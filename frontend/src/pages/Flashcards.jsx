import React, { useEffect, useState } from "react";
import api from "../api";

export default function Flashcards() {
  const [cards, setCards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "", subjectId: "" });
  const [editingId, setEditingId] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizzing, setQuizzing] = useState(false);
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/flashcards"), api.get("/subjects")])
      .then(([cardsRes, subjectsRes]) => {
        setCards(cardsRes.data);
        setSubjects(subjectsRes.data);
      })
      .catch(() => setError("Failed to load flashcards."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/flashcards/${editingId}`, form);
      } else {
        await api.post("/flashcards", form);
      }
      setForm({ question: "", answer: "", subjectId: "" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save flashcard.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ question: c.question, answer: c.answer, subjectId: c.subjectId || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ question: "", answer: "", subjectId: "" });
  };

  const remove = async (id) => {
    if (!confirm("Delete this flashcard?")) return;
    await api.delete(`/flashcards/${id}`);
    load();
  };

  const visibleCards = filterSubjectId
    ? cards.filter((c) => c.subjectId === filterSubjectId)
    : cards;

  const dueCards = visibleCards.filter((c) => new Date(c.nextReview) <= new Date());

  const startQuiz = () => {
    setQuizzing(true);
    setQuizIndex(0);
    setShowAnswer(false);
  };

  const answerCard = async (correct) => {
    const card = dueCards[quizIndex];
    try {
      await api.post(`/flashcards/${card.id}/review`, { correct });
    } catch {
      setError("Failed to record review.");
    }
    if (quizIndex + 1 < dueCards.length) {
      setQuizIndex(quizIndex + 1);
      setShowAnswer(false);
    } else {
      setQuizzing(false);
      load();
    }
  };

  const subjectName = (id) =>
    subjects.find((s) => s.id === id)?.name || "General";

  if (loading) return <p className="muted">Loading flashcards…</p>;

  return (
    <div>
      <h1 className="page-title">Flashcards</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {!quizzing && (
        <>
          <form className="card" onSubmit={submit}>
            <h2>{editingId ? "Edit Flashcard" : "New Flashcard"}</h2>
            <div className="inline-form">
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
            </div>
            <input
              placeholder="Question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              required
            />
            <input
              placeholder="Answer"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              required
            />
            <div className="row-actions" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Update Card" : "Add Card"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="card">
            <h2>Self-Quiz (Spaced Repetition)</h2>
            <div className="inline-form" style={{ marginBottom: 8 }}>
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="muted">
              {dueCards.length} card{dueCards.length !== 1 ? "s" : ""} due for
              review right now.
            </p>
            <button
              className="btn btn-primary"
              disabled={dueCards.length === 0}
              onClick={startQuiz}
            >
              Start Quiz
            </button>
          </div>

          <div className="card-grid">
            {visibleCards.map((c) => (
              <div className="card" key={c.id}>
                <p className="muted small">
                  {subjectName(c.subjectId)} · streak {c.correctStreak || 0}
                </p>
                <strong>{c.question}</strong>
                <p className="muted small">
                  Next review: {new Date(c.nextReview).toLocaleDateString()}
                </p>
                <div className="row-actions" style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => startEdit(c)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {visibleCards.length === 0 && (
              <p className="muted">No flashcards yet.</p>
            )}
          </div>
        </>
      )}

      {quizzing && dueCards[quizIndex] && (
        <div className="card quiz-card">
          <p className="muted small">
            Card {quizIndex + 1} of {dueCards.length}
          </p>
          <h2>{dueCards[quizIndex].question}</h2>
          {showAnswer ? (
            <>
              <p className="quiz-answer">{dueCards[quizIndex].answer}</p>
              <div
                className="row-actions"
                style={{ justifyContent: "center", marginTop: 10 }}
              >
                <button
                  className="btn btn-danger"
                  onClick={() => answerCard(false)}
                >
                  Got it wrong
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => answerCard(true)}
                >
                  Got it right
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => setShowAnswer(true)}
            >
              Show answer
            </button>
          )}
          <button
            className="btn btn-ghost"
            style={{ marginTop: 12 }}
            onClick={() => { setQuizzing(false); load(); }}
          >
            Exit quiz
          </button>
        </div>
      )}
    </div>
  );
}
