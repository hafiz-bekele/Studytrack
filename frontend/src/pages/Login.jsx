import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";

function looksLikeEmail(s) {
  return s.includes("@");
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [errorMsg,   setErrorMsg]   = useState(""); // inline error

  const typedEmail   = looksLikeEmail(identifier);
  const emailInvalid = typedEmail && identifier.length > 5 && !isValidEmail(identifier);

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (emailInvalid) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      toast.success("Welcome back! 👋");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error || "Login failed — please try again";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card animate-scale" onSubmit={submit}>

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📖</div>
          <div><div className="auth-title">StudyTrack</div></div>
        </div>
        <p className="auth-sub">Log in to continue your study journey</p>

        {/* Username or Email */}
        <div className="form-group">
          <label className="form-label">Username or Email *</label>
          <input
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setErrorMsg(""); }}
            placeholder="Enter your username or email"
            autoComplete="username"
            required
            autoFocus
            style={{
              borderColor: emailInvalid ? "var(--danger)" : undefined,
              boxShadow: emailInvalid ? "0 0 0 3px rgba(239,71,111,0.15)" : undefined,
            }}
          />
          {/* Email format feedback */}
          {emailInvalid && (
            <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>
              ✗ Invalid email format — check for missing domain (e.g. @gmail.com)
            </div>
          )}
          {typedEmail && !emailInvalid && identifier.length > 5 && (
            <div style={{ fontSize: 11, color: "var(--success)", marginTop: 5, fontWeight: 600 }}>
              ✓ Valid email format
            </div>
          )}
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
              placeholder="Enter your password"
              autoComplete="current-password"
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
        </div>

        {/* Inline error message */}
        {errorMsg && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "rgba(239,71,111,0.12)",
            border: "1px solid rgba(239,71,111,0.4)",
            borderLeft: "4px solid #ef476f",
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            marginBottom: 8,
            fontSize: 13, color: "#ff8fab", fontWeight: 500,
            lineHeight: 1.5,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || emailInvalid}
          style={{ width: "100%", marginTop: 8 }}
        >
          {loading ? "Logging in…" : "Log in →"}
        </button>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Create one free</Link>
        </p>
      </form>
    </div>
  );
}
