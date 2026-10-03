import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ── Floating orbs ──────────────────────────────────────────────────────── */
function Orbs() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.18) 0%, transparent 70%)", animation: "orbFloat1 12s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "5%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,157,0.14) 0%, transparent 70%)", animation: "orbFloat2 15s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "30%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,170,0.1) 0%, transparent 70%)", animation: "orbFloat3 18s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "0%", right: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,209,102,0.1) 0%, transparent 70%)", animation: "orbFloat1 10s ease-in-out infinite reverse" }} />
      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,30px) scale(1.08)} 70%{transform:translate(30px,-20px) scale(0.95)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,-40px) scale(1.04)} }
      `}</style>
    </div>
  );
}

/* ── App mockup (always dark-styled — it's a screenshot of the app) ─────── */
function AppMockup() {
  const HEATMAP = Array.from({ length: 84 }, () => { const r = Math.random(); return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.3 ? 2 : r > 0.1 ? 1 : 0; });
  const SUBJECTS = [{ label: "Mathematics", pct: 72, color: "#6c63ff" }, { label: "Physics", pct: 45, color: "#ff6b9d" }, { label: "History", pct: 88, color: "#06d6a0" }, { label: "Chemistry", pct: 30, color: "#ffd166" }];
  const STATS = [{ label: "Total Hours", value: "142.5h", color: "#6c63ff" }, { label: "Streak", value: "12 🔥", color: "#ffd166" }, { label: "This Week", value: "8.5h", color: "#06d6a0" }, { label: "This Month", value: "34h", color: "#ff6b9d" }];
  const g = (extra = {}) => ({ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 20, ...extra });

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", ...g(), boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,99,255,0.15)" }}>
      {/* Browser bar */}
      <div style={{ height: 40, background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef476f", opacity: 0.8 }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffd166", opacity: 0.8 }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#06d6a0", opacity: 0.8 }} />
        <div style={{ flex: 1, maxWidth: 320, margin: "0 auto", background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>localhost:5173 - StudyTrack</span>
        </div>
      </div>
      <div style={{ display: "flex", height: 440 }}>
        {/* Sidebar */}
        <div style={{ width: 180, flexShrink: 0, padding: "16px 10px", background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, paddingLeft: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📖</div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#8b85ff" }}>StudyTrack</span>
          </div>
          {[{ icon: "🏠", label: "Dashboard", active: true }, { icon: "📊", label: "Analytics", active: false }, { icon: "⏱️", label: "Pomodoro", active: false }, { icon: "📝", label: "Notes", active: false }, { icon: "🧠", label: "Flashcards", active: false }, { icon: "🎓", label: "Learning", active: false }, { icon: "✅", label: "Tasks", active: false }].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, marginBottom: 2, background: item.active ? "rgba(108,99,255,0.2)" : "transparent", border: item.active ? "1px solid rgba(108,99,255,0.3)" : "1px solid transparent" }}>
              <span style={{ fontSize: 11 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: item.active ? "#8b85ff" : "#6b6b85", fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: 20, overflowY: "hidden" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#e8e8f0", marginBottom: 16 }}>Welcome back 👋</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ ...g({ borderRadius: 10, padding: "10px 12px" }), borderTop: `2px solid ${s.color}` }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#6b6b85", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ ...g({ borderRadius: 10, padding: 12 }) }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#e8e8f0", marginBottom: 8 }}>Study Heatmap</div>
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 12 }).map((_, col) => (
                  <div key={col} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {Array.from({ length: 7 }).map((_, row) => {
                      const lvl = HEATMAP[col * 7 + row];
                      const bg = lvl === 4 ? "#6c63ff" : lvl === 3 ? "rgba(108,99,255,0.7)" : lvl === 2 ? "rgba(108,99,255,0.4)" : lvl === 1 ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)";
                      return <div key={row} style={{ width: 9, height: 7, borderRadius: 2, background: bg }} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...g({ borderRadius: 10, padding: 12 }) }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#e8e8f0", marginBottom: 8 }}>Subject Progress</div>
              {SUBJECTS.map((s) => (
                <div key={s.label} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: "#a0a0b8" }}>{s.label}</span>
                    <span style={{ fontSize: 9, color: s.color }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...g({ borderRadius: 10, padding: "10px 14px" }), display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#e8e8f0", fontWeight: 700 }}>Quick Log</span>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "4px 10px", fontSize: 9, color: "#a0a0b8" }}>30 min</div>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "4px 10px", fontSize: 9, color: "#a0a0b8" }}>Mathematics</div>
            <div style={{ marginLeft: "auto", background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", borderRadius: 6, padding: "5px 12px", fontSize: 9, fontWeight: 700, color: "white" }}>Log Session</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Static data ────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: "⏱️", title: "Pomodoro Timer",      color: "#6c63ff", desc: "25-min focus sessions with automatic logging, mood tracking, and configurable long breaks." },
  { icon: "📊", title: "Analytics Dashboard", color: "#ff6b9d", desc: "Weekly trends, subject breakdowns, and a 12-week study heatmap in one view." },
  { icon: "🗓️", title: "4-Month Planner",     color: "#06d6a0", desc: "One-click 16-week plan rotating subjects through Foundation to Final Revision phases." },
  { icon: "🧠", title: "Spaced Repetition",   color: "#ffd166", desc: "Flashcard system with intelligent scheduling — hard cards come back sooner." },
  { icon: "🏆", title: "Achievements",        color: "#f59e0b", desc: "15+ badges for streaks, hours logged, early-bird sessions and subject milestones." },
  { icon: "📝", title: "Rich Notes Editor",   color: "#0891b2", desc: "Bold, italic, headings, checklists, code blocks and live markdown preview." },
  { icon: "🎯", title: "Goal Tracking",       color: "#9333ea", desc: "Weekly, monthly or all-time hour targets per subject with live progress bars." },
  { icon: "🎓", title: "Learning Room",       color: "#ef4444", desc: "Watch YouTube embedded, upload PDFs, take notes right beside the video." },
  { icon: "✅", title: "Smart Todo List",     color: "#059669", desc: "Kanban board with start/end dates, estimated hours, and subtask checklists." },
  { icon: "🔬", title: "Focus Insights",      color: "#6c63ff", desc: "Peak study hours, best weekday, mood trends — all derived from your sessions." },
  { icon: "🔍", title: "Global Search",       color: "#ff6b9d", desc: "Search notes, tasks, resources, flashcards and subjects instantly." },
  { icon: "🌙", title: "Dark & Light Mode",   color: "#06d6a0", desc: "Beautiful dark mode (default) and light mode. Toggle any time." },
];

const TESTIMONIALS = [
  { name: "Aisha K.",  role: "Medical student",     avatar: "AK", color: "#6c63ff", text: "StudyTrack completely transformed how I prepare for exams. The planner keeps me on track and the streak feature makes me want to study every day." },
  { name: "Marco R.",  role: "Law student",         avatar: "MR", color: "#ff6b9d", text: "Pomodoro timer plus automatic session logging is genius. I don't have to think about tracking — it just works. Productivity doubled in two weeks." },
  { name: "Priya S.",  role: "Engineering student", avatar: "PS", color: "#06d6a0", text: "The Learning Room is my favourite feature. I paste YouTube lecture links and watch them with my notes open right beside the video. Game changer." },
  { name: "James T.",  role: "CPA exam candidate",  avatar: "JT", color: "#ffd166", text: "Now I have analytics showing hours by subject, a heatmap of my consistency, and I've hit 80+ hours this month. Never going back." },
];

const STEPS = [
  { num: "01", icon: "📚", title: "Add your subjects",    desc: "Create subjects with colours and topic counts. StudyTrack tracks curriculum completion for you." },
  { num: "02", icon: "🗓️", title: "Generate your plan",   desc: "One click gives you a personalised 16-week plan rotating focus across subjects." },
  { num: "03", icon: "⏱️", title: "Study with the timer", desc: "Start a Pomodoro. When it ends your session is logged automatically." },
  { num: "04", icon: "📊", title: "Track your progress",  desc: "Watch your heatmap fill up, earn badges, and see exactly how many hours you put in." },
];

/* ══════════════════════════════════════════════════════════════════════════
   Main Landing Page
══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [isDark,   setIsDark]   = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* ── Adaptive colour palette — every colour switches on isDark ── */
  const D = isDark;
  const c = {
    bg:              D ? "#08081a" : "#f0f2ff",
    text:            D ? "#e8e8f0" : "#1a1a2e",
    textSub:         D ? "rgba(232,232,240,0.6)"  : "rgba(26,26,46,0.65)",
    textMid:         D ? "rgba(232,232,240,0.45)" : "rgba(26,26,46,0.55)",
    navBg:           D ? (scrolled ? "rgba(8,8,26,0.92)"    : "rgba(8,8,26,0.55)")
                       : (scrolled ? "rgba(240,242,255,0.96)": "rgba(240,242,255,0.75)"),
    navBorder:       D ? (scrolled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)")
                       : (scrolled ? "rgba(108,99,255,0.18)"  : "rgba(108,99,255,0.1)"),
    navLink:         D ? "rgba(255,255,255,0.55)" : "rgba(26,26,46,0.6)",
    navLinkHover:    D ? "#ffffff"                : "#1a1a2e",
    btnGlass:        D ? "rgba(255,255,255,0.07)" : "rgba(108,99,255,0.08)",
    btnGlassBorder:  D ? "rgba(255,255,255,0.12)" : "rgba(108,99,255,0.22)",
    btnGlassText:    D ? "#ffffff"                : "#1a1a2e",
    glassCard:       D ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.75)",
    glassCardBorder: D ? "rgba(255,255,255,0.10)" : "rgba(108,99,255,0.15)",
    glassCardHover:  D ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.95)",
    featureTitle:    D ? "#e8e8f0" : "#1a1a2e",
    featureDesc:     D ? "rgba(255,255,255,0.45)" : "rgba(26,26,46,0.6)",
    sectionAlt:      D ? "rgba(255,255,255,0.01)" : "rgba(108,99,255,0.03)",
    divider:         D ? "rgba(255,255,255,0.07)" : "rgba(108,99,255,0.12)",
    statLabel:       D ? "rgba(255,255,255,0.4)"  : "rgba(26,26,46,0.5)",
    quoteText:       D ? "rgba(255,255,255,0.55)" : "rgba(26,26,46,0.65)",
    testimonialRole: D ? "rgba(255,255,255,0.35)" : "rgba(26,26,46,0.45)",
    ctaGlass:        D ? "rgba(108,99,255,0.09)"  : "rgba(108,99,255,0.07)",
    ctaText:         D ? "rgba(255,255,255,0.5)"  : "rgba(26,26,46,0.6)",
    ctaBorder:       D ? "rgba(255,255,255,0.07)" : "rgba(108,99,255,0.12)",
    trustText:       D ? "rgba(255,255,255,0.4)"  : "rgba(26,26,46,0.5)",
    footerBg:        D ? "rgba(255,255,255,0.02)" : "rgba(108,99,255,0.04)",
    footerBorder:    D ? "rgba(255,255,255,0.06)" : "rgba(108,99,255,0.1)",
    footerLink:      D ? "rgba(255,255,255,0.3)"  : "rgba(26,26,46,0.4)",
    footerLinkHover: D ? "rgba(255,255,255,0.7)"  : "#1a1a2e",
    footerText:      D ? "rgba(255,255,255,0.25)" : "rgba(26,26,46,0.35)",
  };

  const gc = (extra = {}) => ({
    background: c.glassCard,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${c.glassCardBorder}`,
    borderRadius: 20,
    ...extra,
  });

  const hoverIn  = (e, bg, border, shadow) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.background = bg; if (border) e.currentTarget.style.borderColor = border; if (shadow) e.currentTarget.style.boxShadow = shadow; };
  const hoverOut = (e, bg, border)         => { e.currentTarget.style.transform = "";                 e.currentTarget.style.background = bg; if (border) e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = "none"; };

  return (
    <div style={{ background: c.bg, color: c.text, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <Orbs />

      {/* ══ Navbar ══ */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 64, background: c.navBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: `1px solid ${c.navBorder}`, transition: "all 0.35s ease", boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.15)" : "none" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📖</div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(135deg,#8b85ff,#ff8ab8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>StudyTrack</span>
        </a>

        <div style={{ display: "flex", gap: 32 }}>
          {["#features", "#how", "#testimonials"].map((href) => (
            <a key={href} href={href} style={{ color: c.navLink, textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = c.navLinkHover}
              onMouseLeave={(e) => e.currentTarget.style.color = c.navLink}
            >{href.slice(1).charAt(0).toUpperCase() + href.slice(2)}</a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Theme toggle */}
          <button onClick={() => setIsDark((d) => !d)} title={D ? "Switch to light mode" : "Switch to dark mode"}
            style={{ width: 38, height: 38, borderRadius: 10, background: c.btnGlass, backdropFilter: "blur(10px)", border: `1px solid ${c.btnGlassBorder}`, color: c.btnGlassText, fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.background = D ? "rgba(255,255,255,0.15)" : "rgba(108,99,255,0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.background = c.btnGlass}
          >{D ? "☀️" : "🌙"}</button>

          <Link to="/login" style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: c.btnGlass, backdropFilter: "blur(10px)", border: `1px solid ${c.btnGlassBorder}`, color: c.btnGlassText, textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = D ? "rgba(255,255,255,0.12)" : "rgba(108,99,255,0.12)"}
            onMouseLeave={(e) => e.currentTarget.style.background = c.btnGlass}
          >Log in</Link>

          <Link to="/register" style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#6c63ff,#9c54e8)", color: "white", textDecoration: "none", boxShadow: "0 4px 18px rgba(108,99,255,0.45)", transition: "all 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 28px rgba(108,99,255,0.65)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 4px 18px rgba(108,99,255,0.45)"}
          >Get started free</Link>
        </div>
      </nav>

      {/* ══ Hero ══ */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 100, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(108,99,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 99, padding: "6px 18px", fontSize: 11, fontWeight: 700, color: "#a5a0ff", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 28, animation: "fadeSlideUp 0.6s ease both" }}>
          ✨ Built for 4-month exam sprints
        </div>

        <h1 style={{ fontSize: "clamp(40px,7vw,82px)", fontWeight: 900, letterSpacing: "-3px", lineHeight: 1.04, textAlign: "center", color: c.text, marginBottom: 22, animation: "fadeSlideUp 0.7s ease 0.1s both", maxWidth: 900 }}>
          Study smarter.{" "}
          <span style={{ background: "linear-gradient(135deg,#8b85ff 0%,#ff6b9d 50%,#00d4aa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Track everything.</span>
          <br />Ace your exams.
        </h1>

        <p style={{ fontSize: 18, color: c.textSub, maxWidth: 580, textAlign: "center", lineHeight: 1.75, marginBottom: 38, animation: "fadeSlideUp 0.7s ease 0.2s both" }}>
          StudyTrack combines a Pomodoro timer, spaced-repetition flashcards, 4-month planner, analytics and 20+ features into one beautiful, completely free study companion.
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 70, animation: "fadeSlideUp 0.7s ease 0.3s both" }}>
          <Link to="/register" style={{ padding: "14px 32px", borderRadius: 14, fontSize: 15, fontWeight: 700, background: "linear-gradient(135deg,#6c63ff,#9c54e8)", color: "white", textDecoration: "none", boxShadow: "0 8px 32px rgba(108,99,255,0.5)", transition: "all 0.25s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(108,99,255,0.65)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(108,99,255,0.5)"; }}
          >🚀 Start for free</Link>
          <Link to="/login" style={{ padding: "14px 32px", borderRadius: 14, fontSize: 15, fontWeight: 600, background: c.btnGlass, backdropFilter: "blur(16px)", border: `1px solid ${c.btnGlassBorder}`, color: c.btnGlassText, textDecoration: "none", transition: "all 0.25s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = D ? "rgba(255,255,255,0.1)" : "rgba(108,99,255,0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.background = c.btnGlass}
          >Log in →</Link>
        </div>

        <div style={{ width: "100%", maxWidth: 900, animation: "fadeSlideUp 0.9s ease 0.5s both", position: "relative" }}>
          <div style={{ position: "absolute", inset: -60, background: "radial-gradient(ellipse at 50% 50%,rgba(108,99,255,0.25) 0%,transparent 65%)", pointerEvents: "none" }} />
          <AppMockup />
        </div>

        <div style={{ display: "flex", gap: 48, justifyContent: "center", flexWrap: "wrap", marginTop: 60, paddingTop: 50, borderTop: `1px solid ${c.divider}`, width: "100%", maxWidth: 700, animation: "fadeSlideUp 0.7s ease 0.6s both" }}>
          {[{ value: "20+", label: "Built-in features" }, { value: "15+", label: "Achievement badges" }, { value: "100%", label: "Free, forever" }, { value: "0", label: "Ads, ever" }].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", background: "linear-gradient(135deg,#8b85ff,#ff6b9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: c.statLabel, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Features ══ */}
      <section id="features" style={{ padding: "110px 48px", position: "relative", zIndex: 1, background: c.sectionAlt }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-block", background: "rgba(108,99,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 99, padding: "5px 16px", fontSize: 11, fontWeight: 700, color: "#a5a0ff", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Everything in one place</div>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-1px", marginBottom: 12, color: c.text }}>
            Every tool to <span style={{ background: "linear-gradient(135deg,#8b85ff,#ff6b9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>crush</span> your studies
          </h2>
          <p style={{ fontSize: 16, color: c.textMid, maxWidth: 480, margin: "0 auto" }}>No extra apps. No subscriptions. Everything works together.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ ...gc({ padding: 24 }), position: "relative", overflow: "hidden", transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)" }}
              onMouseEnter={(e) => hoverIn(e, c.glassCardHover, `${f.color}55`, `0 20px 60px rgba(0,0,0,0.15),0 0 0 1px ${f.color}33`)}
              onMouseLeave={(e) => hoverOut(e, c.glassCard, c.glassCardBorder)}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: f.color }} />
              <div style={{ position: "absolute", top: -60, right: -60, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle,${f.color}20 0%,transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ width: 48, height: 48, borderRadius: 14, marginBottom: 14, background: `${f.color}18`, border: `1px solid ${f.color}33`, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 7, color: c.featureTitle }}>{f.title}</div>
              <div style={{ fontSize: 13, color: c.featureDesc, lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ How it works ══ */}
      <section id="how" style={{ padding: "110px 48px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: "rgba(6,214,160,0.10)", backdropFilter: "blur(12px)", border: "1px solid rgba(6,214,160,0.3)", borderRadius: 99, padding: "5px 16px", fontSize: 11, fontWeight: 700, color: "#06d6a0", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Simple to get started</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-1px", color: c.text }}>Up and studying in minutes</h2>
            <p style={{ fontSize: 16, color: c.textMid, marginTop: 10 }}>No complicated setup. Just sign up and start.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, position: "relative" }}>
            <div style={{ position: "absolute", top: 48, left: "8%", right: "8%", height: 1, background: "linear-gradient(90deg,transparent,rgba(108,99,255,0.5),rgba(255,107,157,0.5),transparent)", pointerEvents: "none" }} />
            {STEPS.map((s) => (
              <div key={s.num} style={{ ...gc({ borderRadius: 18, padding: "28px 22px" }), textAlign: "center", position: "relative", zIndex: 1, transition: "all 0.25s ease" }}
                onMouseEnter={(e) => hoverIn(e, c.glassCardHover, null, "0 24px 60px rgba(0,0,0,0.15)")}
                onMouseLeave={(e) => hoverOut(e, c.glassCard, null)}
              >
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 13, fontWeight: 900, color: "white", boxShadow: "0 8px 24px rgba(108,99,255,0.45)" }}>{s.num}</div>
                <div style={{ fontSize: 30, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: c.text }}>{s.title}</div>
                <div style={{ fontSize: 13, color: c.textMid, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Testimonials ══ */}
      <section id="testimonials" style={{ padding: "110px 48px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: "rgba(255,107,157,0.10)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,107,157,0.3)", borderRadius: 99, padding: "5px 16px", fontSize: 11, fontWeight: 700, color: "#ff8ab8", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Real students</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-1px", color: c.text }}>Students who transformed their study routine</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 18 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{ ...gc({ borderRadius: 18, padding: 26 }), transition: "all 0.25s ease", position: "relative", overflow: "hidden" }}
                onMouseEnter={(e) => hoverIn(e, c.glassCardHover, `${t.color}44`, `0 20px 60px rgba(0,0,0,0.15),0 0 0 1px ${t.color}33`)}
                onMouseLeave={(e) => hoverOut(e, c.glassCard, c.glassCardBorder)}
              >
                <div style={{ position: "absolute", top: -40, right: -40, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle,${t.color}20 0%,transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ color: "#ffd166", fontSize: 13, marginBottom: 14, letterSpacing: 3 }}>★★★★★</div>
                <p style={{ fontSize: 14, color: c.quoteText, lineHeight: 1.75, marginBottom: 20, fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${t.color},${t.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", boxShadow: `0 4px 12px ${t.color}55` }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: c.testimonialRole }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "120px 48px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ ...gc({ borderRadius: 28, padding: "64px 48px" }), maxWidth: 700, margin: "0 auto", boxShadow: "0 40px 100px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)", background: c.ctaGlass }}>
          <div style={{ display: "inline-block", background: "rgba(108,99,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(108,99,255,0.35)", borderRadius: 99, padding: "5px 16px", fontSize: 11, fontWeight: 700, color: "#a5a0ff", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 22 }}>Free forever</div>
          <h2 style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.1, marginBottom: 18, color: c.text }}>
            Ready to start your{" "}
            <span style={{ background: "linear-gradient(135deg,#8b85ff,#ff6b9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>study transformation?</span>
          </h2>
          <p style={{ fontSize: 16, color: c.ctaText, marginBottom: 36, lineHeight: 1.75 }}>
            Join StudyTrack today. Completely free — no credit card, no subscription, no limits.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register" style={{ padding: "15px 38px", borderRadius: 14, fontSize: 15, fontWeight: 700, background: "linear-gradient(135deg,#6c63ff,#9c54e8)", color: "white", textDecoration: "none", boxShadow: "0 8px 32px rgba(108,99,255,0.5)", transition: "all 0.25s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(108,99,255,0.7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(108,99,255,0.5)"; }}
            >🚀 Create your free account</Link>
            <Link to="/login" style={{ padding: "15px 28px", borderRadius: 14, fontSize: 15, fontWeight: 600, background: c.btnGlass, backdropFilter: "blur(16px)", border: `1px solid ${c.btnGlassBorder}`, color: c.btnGlassText, textDecoration: "none", transition: "all 0.25s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = D ? "rgba(255,255,255,0.10)" : "rgba(108,99,255,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = c.btnGlass}
            >Already have an account →</Link>
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 40, paddingTop: 36, borderTop: `1px solid ${c.ctaBorder}` }}>
            {[{ icon: "🔒", text: "Your data stays local" }, { icon: "💾", text: "SQLite database" }, { icon: "⚡", text: "No setup required" }, { icon: "🎯", text: "20+ features, zero cost" }].map((b) => (
              <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: c.trustText }}>
                <span>{b.icon}</span><span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer style={{ padding: "32px 48px", position: "relative", zIndex: 1, background: c.footerBg, backdropFilter: "blur(20px)", borderTop: `1px solid ${c.footerBorder}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#6c63ff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📖</div>
            <span style={{ fontSize: 14, fontWeight: 800, background: "linear-gradient(135deg,#8b85ff,#ff8ab8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>StudyTrack</span>
          </a>
          <div style={{ display: "flex", gap: 24 }}>
            {["#features", "#how", "#testimonials"].map((href) => (
              <a key={href} href={href} style={{ color: c.footerLink, textDecoration: "none", fontSize: 12, transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = c.footerLinkHover}
                onMouseLeave={(e) => e.currentTarget.style.color = c.footerLink}
              >{href.slice(1).charAt(0).toUpperCase() + href.slice(2)}</a>
            ))}
          </div>
          <p style={{ color: c.footerText, fontSize: 12 }}>
            {"\u00A9"} {new Date().getFullYear()} StudyTrack {"\u2014"} Built with love for students
          </p>
        </div>
      </footer>
    </div>
  );
}
