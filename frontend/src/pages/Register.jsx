import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";

/* ── Password rule checker ──────────────────────────────────────────────
   Returns an object with one boolean per rule so we can show a live checklist.
─────────────────────────────────────────────────────────────────────── */
function checkRules(pw) {
  return {
    length:    pw.length >= 6,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  };
}

function allPassed(rules) {
  return Object.values(rules).every(Boolean);
}

/* Strength level 0-4 based on how many rules pass */
function strengthLevel(rules) {
  return Object.values(rules).filter(Boolean).length; // 0-5
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong", "Very strong 💪"];
const STRENGTH_COLOR = ["", "#ef476f", "#ffd166", "#f59e0b", "#06d6a0", "#6c63ff"];

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    username: "", email: "", password: "", confirmPassword: "",
    examDate: "", weeklyHourGoal: 10,
  });
  const [showPw,  setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* live rule checks */
  const rules   = checkRules(form.password);
  const level   = strengthLevel(rules);
  const isValid = allPassed(rules);

  const submit = async (e) => {
    e.preventDefault();

    /* Frontend guard — mirrors backend rules */
    if (!isValid) {
      toast.error("Password doesn't meet all requirements");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      toast.success("Account created! Let's get studying 🚀");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const RULES_LIST = [
    { key: "length",    label: "At least 6 characters" },
    { key: "uppercase", label: "One uppercase letter (A-Z)" },
    { key: "lowercase", label: "One lowercase letter (a-z)" },
    { key: "number",    label: "One number (0-9)" },
    { key: "special",   label: "One special character (!@#$%…)" },
  ];

  return (
    <div className="auth-page">
      <form className="auth-card animate-scale" onSubmit={submit}
        style={{ maxWidth: 500 }}>

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📖</div>
          <div><div className="auth-title">StudyTrack</div></div>
        </div>
        <p className="auth-sub">Create your free account and start your 4-month plan</p>

        {/* Username */}
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="e.g. hafiz123"
            autoComplete="off"
            required autoFocus
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">Email address *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
            You can also use your email to log in
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: "var(--text-3)", padding: 4,
              }}
              title={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Strength bar */}
          {form.password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                display: "flex", gap: 3, marginBottom: 6,
              }}>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 999,
                    background: i <= level
                      ? STRENGTH_COLOR[level]
                      : "var(--card-border)",
                    transition: "background 0.3s ease",
                  }} />
                ))}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600,
                color: STRENGTH_COLOR[level] || "var(--text-3)",
              }}>
                {STRENGTH_LABEL[level] || ""}
              </div>
            </div>
          )}

          {/* Rules checklist — shown once user starts typing */}
          {form.password.length > 0 && (
            <div style={{
              marginTop: 10, padding: "10px 12px",
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--radius-sm)",
            }}>
              {RULES_LIST.map((r) => (
                <div key={r.key} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 12, marginBottom: 5,
                  color: rules[r.key] ? "var(--success)" : "var(--text-3)",
                  transition: "color 0.2s",
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    background: rules[r.key]
                      ? "var(--success)" : "var(--card-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "white",
                    transition: "background 0.2s",
                  }}>
                    {rules[r.key] ? "✓" : ""}
                  </span>
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="form-group">
          <label className="form-label">Confirm password *</label>
          <div style={{ position: "relative" }}>
            <input
              type={showCPw ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowCPw((v) => !v)}
              style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: "var(--text-3)", padding: 4,
              }}
              title={showCPw ? "Hide password" : "Show password"}
            >
              {showCPw ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Match indicator */}
          {form.confirmPassword.length > 0 && (
            <div style={{
              fontSize: 11, marginTop: 5, fontWeight: 600,
              color: form.password === form.confirmPassword
                ? "var(--success)" : "var(--danger)",
            }}>
              {form.password === form.confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords don't match"}
            </div>
          )}
        </div>

        {/* Optional fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Exam date (optional)</label>
            <input
              type="date"
              value={form.examDate}
              onChange={(e) => set("examDate", e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Weekly hour goal</label>
            <input
              type="number" min="1" max="100"
              value={form.weeklyHourGoal}
              onChange={(e) => set("weeklyHourGoal", Number(e.target.value))}
            />
          </div>
        </div>

        {/* Submit — disabled until all rules pass */}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || !isValid || form.password !== form.confirmPassword || !form.email}
          style={{ width: "100%", marginTop: 18 }}
        >
          {loading ? "Creating account…" : "Create account →"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
