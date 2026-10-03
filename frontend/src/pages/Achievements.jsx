import React, { useEffect, useState } from "react";
import api from "../api";

export default function Achievements() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/achievements")
      .then((r) => setBadges(r.data))
      .catch(() => setError("Failed to load achievements."))
      .finally(() => setLoading(false));
  }, []);

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  if (loading) return <p className="muted">Loading achievements…</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      <h1 className="page-title">Achievements</h1>

      {earned.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>
            Earned ({earned.length})
          </h2>
          <div className="card-grid" style={{ marginBottom: 24 }}>
            {earned.map((b) => (
              <div className="card badge-card earned" key={b.code}>
                <div className="badge-icon">🏆</div>
                <h3>{b.label}</h3>
                <p className="muted small">{b.desc}</p>
                <p className="muted small">
                  Earned {new Date(b.earnedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>
        Locked ({locked.length})
      </h2>
      <div className="card-grid">
        {locked.map((b) => (
          <div className="card badge-card locked" key={b.code}>
            <div className="badge-icon">🔒</div>
            <h3>{b.label}</h3>
            <p className="muted small">{b.desc}</p>
          </div>
        ))}
        {locked.length === 0 && (
          <p className="muted">You've earned every badge! 🎉</p>
        )}
      </div>
    </div>
  );
}
