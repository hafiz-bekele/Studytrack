import React, { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import toast from "react-hot-toast";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme }  = useTheme();

  // SQLite returns snake_case — guard both shapes
  const [examDate,       setExamDate]       = useState(user?.exam_date       || user?.examDate       || "");
  const [weeklyHourGoal, setWeeklyHourGoal] = useState(user?.weekly_hour_goal || user?.weeklyHourGoal || 10);
  const [localTheme,     setLocalTheme]     = useState(user?.theme || theme);
  const [avatar,         setAvatar]         = useState(user?.avatar || "");
  const [bio,            setBio]            = useState(user?.bio    || "");
  const [newPassword,    setNewPassword]    = useState("");
  const [confirmPw,      setConfirmPw]      = useState("");
  const [saving,         setSaving]         = useState(false);

  // Sync theme from server on mount
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
      setLocalTheme(user.theme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThemeChange = (val) => {
    setLocalTheme(val);
    setTheme(val); // live preview
  };

  const save = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const payload = { examDate, weeklyHourGoal, theme: localTheme, avatar, bio };
      if (newPassword) payload.newPassword = newPassword;
      const { data } = await api.put("/me", payload);
      updateUser(data);
      setTheme(data.theme || localTheme);
      setNewPassword("");
      setConfirmPw("");
      toast.success("Settings saved ✓");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">⚙️ Settings</h1>
        <p className="page-sub">Manage your profile and preferences</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* ── Profile ── */}
        <form className="card" onSubmit={save}>
          <h2 style={{ marginBottom: 18 }}>👤 Profile</h2>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input value={user?.username || ""} disabled
              style={{ opacity: 0.5, cursor: "not-allowed" }} />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea rows={2} placeholder="A short bio…"
              value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Exam / target date</label>
            <input type="date" value={examDate}
              onChange={(e) => setExamDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Weekly study-hour goal</label>
            <input type="number" min="1" max="168" value={weeklyHourGoal}
              onChange={(e) => setWeeklyHourGoal(Number(e.target.value))} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}
            style={{ width: "100%", marginTop: 8 }}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </form>

        {/* ── Appearance + Security ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Theme */}
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>🎨 Appearance</h2>
            <label className="form-label">Theme</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              {["dark", "light"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThemeChange(t)}
                  style={{
                    flex: 1, padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: `2px solid ${localTheme === t ? "var(--primary)" : "var(--card-border)"}`,
                    background: localTheme === t
                      ? "rgba(108,99,255,0.15)" : "var(--card)",
                    color: localTheme === t ? "var(--primary-light)" : "var(--text-2)",
                    fontWeight: 700, cursor: "pointer",
                    fontSize: 13, transition: "var(--transition)",
                  }}
                >
                  {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <form className="card" onSubmit={save}>
            <h2 style={{ marginBottom: 16 }}>🔒 Security</h2>

            <div className="form-group">
              <label className="form-label">New password</label>
              <input type="password" placeholder="Leave blank to keep current"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password" />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input type="password" placeholder="Repeat new password"
                value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password" disabled={!newPassword} />
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving || !newPassword}
              style={{ width: "100%" }}>
              {saving ? "Saving…" : "Change Password"}
            </button>
          </form>

          {/* Info card */}
          <div className="card" style={{
            background: "linear-gradient(135deg, rgba(108,99,255,0.1), rgba(255,107,157,0.07))",
            border: "1px solid rgba(108,99,255,0.2)",
          }}>
            <h2 style={{ marginBottom: 12 }}>📊 Account Stats</h2>
            <div style={{ fontSize: 13, color: "var(--text-2)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div>👤 <strong style={{ color: "var(--text)" }}>{user?.username}</strong></div>
              {(user?.exam_date || user?.examDate) && (
                <div>🎯 Exam: <strong style={{ color: "var(--text)" }}>
                  {user?.exam_date || user?.examDate}
                </strong></div>
              )}
              <div>⏰ Weekly goal: <strong style={{ color: "var(--text)" }}>
                {user?.weekly_hour_goal || user?.weeklyHourGoal || 10}h
              </strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
