import React, { useEffect, useRef, useState, useCallback } from "react";
import api from "../api";
import toast from "react-hot-toast";

const PRESETS = [
  { label: "Pomodoro",     focus: 25, breakMin: 5  },
  { label: "Short Focus",  focus: 15, breakMin: 3  },
  { label: "Deep Work",    focus: 50, breakMin: 10 },
  { label: "Custom",       focus: 30, breakMin: 5  },
];

const MOODS = ["great", "good", "okay", "tired", "stressed"];
const MOOD_EMOJI = { great: "😄", good: "🙂", okay: "😐", tired: "😴", stressed: "😰" };

function beep(frequency = 880, duration = 300) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (_) { /* AudioContext not available */ }
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function StudyTimer() {
  const [subjects, setSubjects]             = useState([]);
  const [tasks, setTasks]                   = useState([]);
  const [presetIdx, setPresetIdx]           = useState(0);
  const [customFocus, setCustomFocus]       = useState(30);
  const [customBreak, setCustomBreak]       = useState(5);
  const [subjectId, setSubjectId]           = useState("");
  const [taskId, setTaskId]                 = useState("");
  const [sessionNotes, setSessionNotes]     = useState("");
  const [mood, setMood]                     = useState("");
  const [mode, setMode]                     = useState("focus");   // focus | break
  const [secondsLeft, setSecondsLeft]       = useState(PRESETS[0].focus * 60);
  const [running, setRunning]               = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalMinToday, setTotalMinToday]   = useState(0);
  const [soundOn, setSoundOn]               = useState(true);
  const [longBreakEvery, setLongBreakEvery] = useState(4); // long break after N sessions
  const [longBreakMin, setLongBreakMin]     = useState(15);
  const intervalRef = useRef(null);

  const focusMin = presetIdx === 3 ? customFocus : PRESETS[presetIdx].focus;
  const breakMin = presetIdx === 3 ? customBreak : PRESETS[presetIdx].breakMin;

  useEffect(() => {
    api.get("/subjects").then((r) => setSubjects(r.data));
    api.get("/tasks").then((r) => setTasks(r.data.filter((t) => t.status !== "done")));
  }, []);

  // Reset timer when preset changes (only if not running)
  useEffect(() => {
    if (!running) {
      setMode("focus");
      setSecondsLeft(focusMin * 60);
    }
  }, [presetIdx, customFocus]);  // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTasks = subjectId
    ? tasks.filter((t) => t.subjectId === subjectId)
    : tasks;

  const logSession = useCallback(async (minutes, type) => {
    try {
      const res = await api.post("/sessions", {
        subjectId: subjectId || null,
        taskId: taskId || null,
        durationMinutes: minutes,
        type,
        notes: sessionNotes,
        mood,
      });
      setTotalMinToday((m) => m + minutes);
      if (res.data.newAchievements?.length) {
        res.data.newAchievements.forEach((a) =>
          toast.success(`🏆 Badge unlocked: ${a.label}!`, { duration: 5000 })
        );
      }
    } catch {
      toast.error("Failed to log session");
    }
  }, [subjectId, taskId, sessionNotes, mood]);

  const handleCycleEnd = useCallback(async () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (soundOn) {
      beep(880, 300);
      setTimeout(() => beep(1100, 200), 400);
    }

    if (mode === "focus") {
      await logSession(focusMin, "pomodoro");
      const newCount = completedToday + 1;
      setCompletedToday(newCount);

      const isLongBreak = newCount % longBreakEvery === 0;
      const nextBreakMin = isLongBreak ? longBreakMin : breakMin;

      toast.success(`✅ Focus session done! ${isLongBreak ? "Long break time 🎉" : "Short break time."}`);
      setMode("break");
      setSecondsLeft(nextBreakMin * 60);
    } else {
      toast(`▶ Break over — start your next focus session!`, { icon: "⏱️" });
      setMode("focus");
      setSecondsLeft(focusMin * 60);
    }
  }, [mode, focusMin, breakMin, logSession, completedToday, longBreakEvery, longBreakMin, soundOn]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            handleCycleEnd();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, handleCycleEnd]);

  // Update document title with timer
  useEffect(() => {
    if (running) {
      document.title = `${formatTime(secondsLeft)} — ${mode === "focus" ? "Focus" : "Break"} | StudyTrack`;
    } else {
      document.title = "StudyTrack";
    }
    return () => { document.title = "StudyTrack"; };
  }, [secondsLeft, running, mode]);

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setMode("focus");
    setSecondsLeft(focusMin * 60);
  };

  const pct = mode === "focus"
    ? 1 - secondsLeft / (focusMin * 60)
    : 1 - secondsLeft / (breakMin * 60);

  const circumference = 2 * Math.PI * 100;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Study Timer</h1>
        <p className="page-sub">Configurable focus sessions with automatic session logging</p>
      </div>

      {/* Preset tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            className={`tab ${presetIdx === i ? "active" : ""}`}
            onClick={() => { if (!running) setPresetIdx(i); }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Timer card */}
        <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
          {/* SVG ring */}
          <svg width="240" height="240" style={{ display: "block", margin: "0 auto 16px" }}>
            <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="120" cy="120" r="100" fill="none"
              stroke={mode === "focus" ? "var(--primary)" : "var(--success)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              transform="rotate(-90 120 120)"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <text x="120" y="108" textAnchor="middle" fill="var(--text)" fontSize="38" fontWeight="900" fontFamily="Inter,sans-serif">
              {formatTime(secondsLeft)}
            </text>
            <text x="120" y="138" textAnchor="middle" fill="var(--text-2)" fontSize="13" fontFamily="Inter,sans-serif">
              {mode === "focus" ? `Focus · ${focusMin}min` : `Break · ${breakMin}min`}
            </text>
          </svg>

          {/* Controls */}
          <div className="row-actions" style={{ justifyContent: "center", gap: 12, marginBottom: 16 }}>
            {!running ? (
              <button className="btn btn-primary" style={{ minWidth: 100 }} onClick={() => setRunning(true)}>
                ▶ Start
              </button>
            ) : (
              <button className="btn btn-ghost" style={{ minWidth: 100 }} onClick={() => setRunning(false)}>
                ⏸ Pause
              </button>
            )}
            <button className="btn btn-ghost" onClick={reset}>↺ Reset</button>
            <button
              className={`btn btn-ghost btn-icon`}
              onClick={() => setSoundOn((s) => !s)}
              title={soundOn ? "Sound on" : "Sound off"}
            >
              {soundOn ? "🔔" : "🔕"}
            </button>
          </div>

          {/* Session count */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 13, color: "var(--text-2)" }}>
            <span>🎯 Sessions today: <strong style={{ color: "var(--text)" }}>{completedToday}</strong></span>
            <span>⏰ Total: <strong style={{ color: "var(--text)" }}>{Math.round(totalMinToday / 6) / 10}h</strong></span>
          </div>

          {/* Long break indicator */}
          {completedToday > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-3)" }}>
              Long break after session {Math.ceil(completedToday / longBreakEvery) * longBreakEvery}
            </div>
          )}
        </div>

        {/* Config card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Custom intervals */}
          {presetIdx === 3 && (
            <div className="card">
              <h2>Custom Intervals</h2>
              <div className="form-group">
                <label className="form-label">Focus (minutes)</label>
                <input type="number" min="1" max="120" value={customFocus}
                  onChange={(e) => { if (!running) setCustomFocus(Number(e.target.value)); }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Break (minutes)</label>
                <input type="number" min="1" max="60" value={customBreak}
                  onChange={(e) => setCustomBreak(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Long break */}
          <div className="card">
            <h2>Long Break Settings</h2>
            <div className="form-group">
              <label className="form-label">Long break every N sessions</label>
              <input type="number" min="2" max="10" value={longBreakEvery}
                onChange={(e) => setLongBreakEvery(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Long break duration (minutes)</label>
              <input type="number" min="5" max="60" value={longBreakMin}
                onChange={(e) => setLongBreakMin(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Session meta */}
          <div className="card">
            <h2>Session Details</h2>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTaskId(""); }}>
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Link to task (optional)</label>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No task</option>
                {filteredTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mood</label>
              <div className="row-actions">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(mood === m ? "" : m)}
                    style={{
                      background: mood === m ? "rgba(108,99,255,0.2)" : "var(--card)",
                      border: `1px solid ${mood === m ? "var(--primary)" : "var(--card-border)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 18,
                      transition: "var(--transition)",
                    }}
                    title={m}
                  >
                    {MOOD_EMOJI[m]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Session notes</label>
              <textarea
                rows="2"
                placeholder="What are you studying?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
