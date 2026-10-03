import React from "react";

// Simple GitHub-style study streak heatmap for the last N days.
export default function Heatmap({ data }) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const level = (m) => {
    if (m <= 0) return 0;
    const ratio = m / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };
  // group into weeks (columns of 7)
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7));

  return (
    <div className="heatmap">
      {weeks.map((week, wi) => (
        <div className="heatmap-col" key={wi}>
          {week.map((d) => (
            <div
              key={d.date}
              className={`heatmap-cell level-${level(d.minutes)}`}
              title={`${d.date}: ${Math.round((d.minutes / 60) * 10) / 10}h`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
