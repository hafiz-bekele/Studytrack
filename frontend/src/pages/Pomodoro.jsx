import React, { useEffect, useRef, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

function format(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function Pomodoro() {
  const [subjects,   setSubjects]   = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [subjectId,  setSubjectId]  = useState("");
  const [taskId,     setTaskId]     = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [mood,       setMood]       = useState("");
  const [mode,       setMode]       = useState("focus");
  const [secondsLeft,setSecondsLeft]= useState(FOCUS_MIN * 60);
  const [running,    setRunning]    = useState(false);
  const [completed,  setCompleted]  = useState(0);
  const [manualMin,  setManualMin]  = useState(30);
  const [manualTask, setManualTask] = useState("");
  const [manualNotes,setManualNotes]= useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    api.get("/subjects").then((r) => setSubjects(r.data)).catch(() => {});
    api.get("/tasks").then((r) => setTasks(r.data.filter((t) => t.status !== "done"))).catch(() => {});
  }, []);

  const filteredTasks = subjectId
    ? tasks.filter((t) => t.subjectId === subjectId)
    : tasks;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { handleCycleEnd(); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Update page title while running
  useEffect(() => {
    if (running) {
      document.title = `${format(secondsLeft)} — ${mode === "focus" ? "Focus" : "Break"} | StudyTrack`;
    } else {
      document.title = "StudyTrack";
    }
    return () => { document.title = "StudyTrack"; };
  }, [secondsLeft, running, mode]);

  const logSession = async (minutes, type, tid, notes) => {
    try {
      const res = await api.post("/sessions", {
        subjectId: subjectId || null,
        taskId:    tid       || null,
        durationMinutes: minutes,
        type, notes: notes || "", mood,
      });
      if (res.data.newAchievements?.length) {
        res.data.newAchievements.forEach((a) =>
          toast.success(`🏆 Badge unlocked: ${a.label}!`, { duration: 5000 })
        );
      }
    } catch {
      toast.error("Failed to log session");
    }
  };

  const handleCycleEnd = async () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (mode === "focus") {
      await logSession(FOCUS_MIN, "pomodoro", taskId, sessionNotes);
      setCompleted((c) => c + 1);
      toast.success("✅ Focus session logged! Take a break.");
      setMode("break");
      setSecondsLeft(BREAK_MIN * 60);
    } else {
      toast("▶ Break over — start your next focus session!", { icon: "⏱️" });
      setMode("focus");
      setSecondsLeft(FOCUS_MIN * 60);
    }
  };

  const logManual = async () => {
    if (!manualMin || manualMin <= 0) { toast.error("Minutes must be > 0"); return; }
    await logSession(manualMin, "manual", manualTask, manualNotes);
    toast.success(`✅ Logged ${manualMin} minutes!`);
    setManualNotes(""); setManualTask("");
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false); setMode("focus");
    setSecondsLeft(FOCUS_MIN * 60);
  };

  const pct = mode === "focus"
    ? 1 - secondsLeft / (FOCUS_MIN * 60)
    : 1 - secondsLeft / (BREAK_MIN * 60);
  const circumference = 2 * Math.PI * 100;

  const MOODS = [
    { key: "great", icon: "😄" }, { key: "good", icon: "🙂" },
    { key: "okay", icon: "😐"  }, { key: "tired", icon: "😴" },
    { key: "stressed", icon: "😰" },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">⏱️ Pomodoro Timer</h1>
        <p className="page-sub">25-minute focus sessions with automatic logging</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Timer */}
        <div className="card" style={{ textAlign: "center", padding: "28px 20px" }}>
          <svg width="240" height="240" style={{ display: "block", margin: "0 auto 12px" }}>
            <circle cx="120" cy="120" r="100" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle cx="120" cy="120" r="100" fill="none"
              stroke={mode === "focus" ? "var(--primary)" : "var(--success)"}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              transform="rotate(-90 120 120)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <text x="120" y="108" textAnchor="middle" fill="var(--text)"
              fontSize="38" fontWeight="900" fontFamily="Inter,sans-serif">
              {format(secondsLeft)}
            </text>
            <text x="120" y="136" textAnchor="middle" fill="var(--text-2)"
              fontSize="13" fontFamily="Inter,sans-serif">
              {mode === "focus" ? `Focus · ${FOCUS_MIN}min` : `Break · ${BREAK_MIN}min`}
            </text>
          </svg>

          <div className="row-actions" style={{ justifyContent: "center", gap: 12, marginBottom: 16 }}>
            {!running
              ? <button className="btn btn-primary" style={{ minWidth: 100 }}
                  onClick={() => setRunning(true)}>▶ Start</button>
              : <button className="btn btn-ghost" style={{ minWidth: 100 }}
                  onClick={() => setRunning(false)}>⏸ Pause</button>
            }
            <button className="btn btn-ghost" onClick={reset}>↺ Reset</button>
          </div>

          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            🎯 Completed today: <strong style={{ color: "var(--text)" }}>{completed}</strong>
          </div>
        </div>

        {/* Session details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <h2>Session Details</h2>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <select value={subjectId}
                onChange={(e) => { setSubjectId(e.target.value); setTaskId(""); }}>
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Linked task</label>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No task</option>
                {filteredTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mood</label>
              <div style={{ display: "flex", gap: 8 }}>
                {MOODS.map((m) => (
                  <button key={m.key} type="button"
                    onClick={() => setMood(mood === m.key ? "" : m.key)}
                    style={{
                      fontSize: 22, background: mood === m.key
                        ? "rgba(108,99,255,0.2)" : "var(--card)",
                      border: `1px solid ${mood === m.key ? "var(--primary)" : "var(--card-border)"}`,
                      borderRadius: "var(--radius-sm)", padding: "5px 8px",
                      cursor: "pointer", transition: "all 0.15s",
                    }} title={m.key}>
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea rows={2} placeholder="What are you working on?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)} />
            </div>
          </div>

          {/* Manual log */}
          <div className="card">
            <h2>⚡ Log Session Manually</h2>
            <div className="inline-form" style={{ marginBottom: 10 }}>
              <input type="number" min="1" value={manualMin}
                onChange={(e) => setManualMin(Number(e.target.value))}
                style={{ width: 80, flex: "0 0 auto" }} />
              <span style={{ alignSelf: "center", color: "var(--text-2)" }}>min</span>
              <select value={subjectId}
                onChange={(e) => { setSubjectId(e.target.value); setManualTask(""); }}
                style={{ flex: 1 }}>
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={manualTask} onChange={(e) => setManualTask(e.target.value)}
                style={{ flex: 1 }}>
                <option value="">No task</option>
                {filteredTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <textarea rows={2} placeholder="Notes (optional)"
              value={manualNotes} onChange={(e) => setManualNotes(e.target.value)}
              style={{ marginBottom: 10 }} />
            <button className="btn btn-primary" onClick={logManual}>
              Log Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
