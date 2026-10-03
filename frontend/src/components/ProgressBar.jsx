import React from "react";

export default function ProgressBar({ pct, color }) {
  const clamped = Math.max(0, Math.min(100, isNaN(pct) ? 0 : (pct || 0)));
  const fill = color || "var(--primary)";
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${clamped}%`, background: fill }}
      />
    </div>
  );
}
