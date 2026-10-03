import React, { useEffect, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = (h) => {
  const n = parseInt(h, 10);
  if (n === 0) return "12am";
  if (n < 12)  return `${n}am`;
  if (n === 12) return "12pm";
  return `${n - 12}pm`;
};

const MOOD_EMOJI = { great: "😄", good: "🙂", okay: "😐", tired: "😴", stressed: "😰" };
const TYPE_COLOR = { pomodoro: "#6c63ff", manual: "#06d6a0" };

export default function FocusStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/stats/focus")
      .then((r) => setStats(r.data))
      .catch(() => toast.error("Failed to load focus stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center"><div className="spinner" /><span>Loading focus stats…</span></div>
  );
  if (!stats) return null;

  // Fill gaps in hour data (0–23)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    const found = stats.byHour.find((x) => x.hour === h);
    return { hour: HOUR_LABELS(h), minutes: found ? Math.round(found.minutes) : 0 };
  });

  // Weekday data
  const weekdayData = DOW_LABELS.map((d, i) => {
    const found = stats.byWeekday.find((x) => Number(x.dow) === i);
    return { day: d, minutes: found ? Math.round(found.minutes) : 0 };
  });

  // Radar for weekday
  const radarData = weekdayData.map((d) => ({
    subject: d.day,
    minutes: d.minutes,
  }));

  const bestHour = hourlyData.reduce((a, b) => (b.minutes > a.minutes ? b : a), hourlyData[0]);
  const bestDay  = weekdayData.reduce((a, b) => (b.minutes > a.minutes ? b : a), weekdayData[0]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">🔬 Focus Stats</h1>
        <p className="page-sub">Understand when and how you study best</p>
      </div>

      {/* Top insights */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: "⏰", label: "Peak hour",   value: bestHour.hour,         sub: `${Math.round(bestHour.minutes / 60 * 10) / 10}h total`,   color: "var(--primary)" },
          { icon: "📅", label: "Best day",    value: bestDay.day,           sub: `${Math.round(bestDay.minutes / 60 * 10) / 10}h total`,    color: "var(--warning)" },
          { icon: "🎯", label: "Avg session", value: `${stats.avgSessionMinutes}min`, sub: "per session",                                     color: "var(--success)" },
          { icon: "📊", label: "Session types", value: stats.byType.length, sub: stats.byType.map((t) => t.type).join(", ") || "—",         color: "var(--secondary)" },
        ].map((s) => (
          <div className="stat-card" key={s.label} style={{ "--accent-color": s.color }}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Last 14 days line chart */}
      <div className="card">
        <h2>Daily Hours (last 14 days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.last14}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-2)" }}
              tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-2)" }} />
            <Tooltip
              contentStyle={{ background: "var(--bg-3)", border: "1px solid var(--card-border)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-2)", fontSize: 11 }}
            />
            <Line type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2.5}
              dot={{ fill: "var(--primary)", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        {/* Hourly heatmap bar */}
        <div className="card">
          <h2>Peak Study Hours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "var(--text-2)" }}
                interval={2} />
              <YAxis tick={{ fontSize: 9, fill: "var(--text-2)" }} />
              <Tooltip
                contentStyle={{ background: "var(--bg-3)", border: "1px solid var(--card-border)", borderRadius: 8 }}
                formatter={(v) => [`${v} min`, "Minutes"]}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {hourlyData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={_.minutes === bestHour.minutes && _.hour === bestHour.hour
                      ? "var(--primary)" : "rgba(108,99,255,0.4)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday radar */}
        <div className="card">
          <h2>Best Days of the Week</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--text-2)" }} />
              <Radar name="Minutes" dataKey="minutes" stroke="var(--primary)"
                fill="var(--primary)" fillOpacity={0.25} />
              <Tooltip
                contentStyle={{ background: "var(--bg-3)", border: "1px solid var(--card-border)", borderRadius: 8 }}
                formatter={(v) => [`${Math.round(v / 60 * 10) / 10}h`, "Study time"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        {/* Session type breakdown */}
        <div className="card">
          <h2>Session Type Breakdown</h2>
          {stats.byType.length === 0
            ? <p className="muted">No sessions logged yet.</p>
            : stats.byType.map((t) => {
              const total = stats.byType.reduce((s, x) => s + x.minutes, 0);
              const pct = total ? Math.round((t.minutes / total) * 100) : 0;
              return (
                <div key={t.type} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                fontSize: 13, marginBottom: 5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%",
                                     background: TYPE_COLOR[t.type] || "var(--accent)", display: "inline-block" }} />
                      {t.type}
                    </span>
                    <span className="muted">
                      {t.count} sessions · {Math.round(t.minutes / 60 * 10) / 10}h · {pct}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill"
                      style={{ width: `${pct}%`, background: TYPE_COLOR[t.type] || "var(--accent)" }} />
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Mood breakdown */}
        <div className="card">
          <h2>Mood When Studying</h2>
          {stats.byMood.length === 0
            ? <p className="muted">No mood data yet. Add your mood in the timer when logging sessions.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stats.byMood
                  .sort((a, b) => b.count - a.count)
                  .map((m) => {
                    const total = stats.byMood.reduce((s, x) => s + x.count, 0);
                    const pct = Math.round((m.count / total) * 100);
                    return (
                      <div key={m.mood} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22, width: 30, textAlign: "center" }}>
                          {MOOD_EMOJI[m.mood] || "😶"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between",
                                        fontSize: 12, marginBottom: 4 }}>
                            <span>{m.mood}</span>
                            <span className="muted">{m.count} sessions ({pct}%)</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
