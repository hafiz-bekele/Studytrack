import React, { useEffect, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const CHART_STYLE = {
  contentStyle: {
    background: "var(--bg-3)", border: "1px solid var(--card-border)",
    borderRadius: 10, fontSize: 12,
  },
  labelStyle: { color: "var(--text-2)", fontSize: 11 },
  axisStyle:  { fontSize: 10, fill: "var(--text-3)" },
  gridStyle:  { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" },
};

const PIE_COLORS = ["#6c63ff","#059669","#dc2626","#d97706","#0891b2","#9333ea","#be185d"];

export default function Analytics() {
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    api.get("/progress/summary")
      .then((r) => setSummary(r.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get("/progress/export.csv", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "study_sessions.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="loading-center animate-in">
      <div className="spinner" /><span>Loading analytics…</span>
    </div>
  );
  if (!summary) return null;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">📊 Analytics</h1>
        <p className="page-sub">Your complete study picture</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { icon:"⏰", label:"Total Hours",    value:`${summary.totalHours}h`,    color:"var(--primary)" },
          { icon:"🔥", label:"Day Streak",     value:summary.streak,              color:"var(--warning)" },
          { icon:"📅", label:"This Week",      value:`${summary.weekHours}h`,     color:"var(--success)" },
          { icon:"📆", label:"This Month",     value:`${summary.monthHours}h`,    color:"var(--secondary)" },
          { icon:"📋", label:"Total Sessions", value:summary.totalSessions,       color:"var(--info)" },
          { icon:"✅", label:"Tasks Done",     value:`${summary.tasksCompleted}/${summary.tasksTotal}`, color:"var(--accent)" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ "--accent-color": s.color }}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Weekly line chart ── */}
      <div className="card">
        <h2>Hours per Week (last 16 weeks)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={summary.weeklySeries}>
            <CartesianGrid {...CHART_STYLE.gridStyle} />
            <XAxis dataKey="weekLabel" tick={CHART_STYLE.axisStyle}
              tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={CHART_STYLE.axisStyle} />
            <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
            <Line type="monotone" dataKey="hours" stroke="var(--primary)"
              strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "var(--primary)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Daily bar chart (last 14 days) ── */}
      {summary.dailyLast14 && (
        <div className="card">
          <h2>Daily Hours (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summary.dailyLast14}>
              <CartesianGrid {...CHART_STYLE.gridStyle} />
              <XAxis dataKey="date" tick={CHART_STYLE.axisStyle}
                tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={CHART_STYLE.axisStyle} />
              <Tooltip contentStyle={CHART_STYLE.contentStyle}
                formatter={(v) => [`${v}h`, "Hours"]} />
              <Bar dataKey="hours" fill="var(--primary)" radius={[4,4,0,0]}
                fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid-2">
        {/* ── Hours per subject bar ── */}
        <div className="card">
          <h2>Hours per Subject</h2>
          {summary.perSubject.length === 0
            ? <p className="muted">No subject data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={summary.perSubject} layout="vertical"
                  margin={{ left: 10, right: 20 }}>
                  <CartesianGrid {...CHART_STYLE.gridStyle} />
                  <XAxis type="number" tick={CHART_STYLE.axisStyle} />
                  <YAxis type="category" dataKey="name" tick={CHART_STYLE.axisStyle}
                    width={80} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle}
                    formatter={(v) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" radius={[0,4,4,0]}>
                    {summary.perSubject.map((s, i) => (
                      <Cell key={i} fill={s.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* ── Topic completion pie ── */}
        <div className="card">
          <h2>Topic Completion by Subject</h2>
          {summary.perSubject.length === 0
            ? <p className="muted">No subject data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={summary.perSubject.filter(s => s.topicCompletionPct > 0)}
                    dataKey="topicCompletionPct" nameKey="name"
                    outerRadius={90} innerRadius={40} label>
                    {summary.perSubject.map((s, i) => (
                      <Cell key={i} fill={s.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle}
                    formatter={(v) => [`${v}%`, "Completion"]} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* ── Study heatmap ── */}
      <div className="card">
        <h2>Study Heatmap (last 12 weeks)</h2>
        {summary.heatmap && (() => {
          const max = Math.max(1, ...summary.heatmap.map(d => d.minutes));
          const level = (m) => m <= 0 ? 0 : m/max > 0.75 ? 4 : m/max > 0.5 ? 3 : m/max > 0.25 ? 2 : 1;
          const weeks = [];
          for (let i = 0; i < summary.heatmap.length; i += 7)
            weeks.push(summary.heatmap.slice(i, i+7));
          return (
            <div className="heatmap">
              {weeks.map((week, wi) => (
                <div className="heatmap-col" key={wi}>
                  {week.map((d) => (
                    <div key={d.date}
                      className={`heatmap-cell level-${level(d.minutes)}`}
                      title={`${d.date}: ${Math.round(d.minutes/60*10)/10}h`} />
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── Export ── */}
      <div className="card">
        <h2>📥 Export Data</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Download your full session log as a CSV file — open in Excel or Google Sheets.
        </p>
        <button className="btn btn-primary" onClick={exportCsv} disabled={exporting}>
          {exporting ? "Exporting…" : "Download CSV"}
        </button>
      </div>
    </div>
  );
}
