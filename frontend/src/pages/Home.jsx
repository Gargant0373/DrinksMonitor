import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../api/client";
import { useTitle } from "../hooks/useTitle";
import styles from "./Home.module.css";

function loadSessions() {
  try { return JSON.parse(localStorage.getItem("dg_sessions") || "[]"); }
  catch { return []; }
}

export default function Home() {
  useTitle(null);
  const navigate = useNavigate();
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [sessions, setSessions] = useState(loadSessions);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { session_id } = await createSession(name.trim());
      const updated = [{ id: session_id, name: name.trim(), created_at: new Date().toISOString() }, ...sessions];
      const trimmed = updated.slice(0, 10);
      localStorage.setItem("dg_sessions", JSON.stringify(trimmed));
      setSessions(trimmed);
      navigate(`/session/${session_id}/setup`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.logo}>🍻</div>
      <h1 className={styles.title}>Drink Session Tracker</h1>
      <p className={styles.sub}>Host a session or scan a QR code to join one.</p>

      <form className={styles.form} onSubmit={handleCreate}>
        <label className="label" htmlFor="session-name">Session name</label>
        <input
          id="session-name"
          placeholder="e.g. Friday Night 🎉"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        {error && <p className="error-msg">{error}</p>}
        <button className="btn btn-primary btn-full" disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create Session"}
        </button>
      </form>

      {sessions.length > 0 && (
        <div className={styles.recent}>
          <p className={styles.recentLabel}>Recent sessions</p>
          {sessions.map((s) => (
            <div key={s.id} className={styles.recentRow}>
              <button
                className={styles.recentBtn}
                onClick={() => navigate(`/session/${s.id}/setup`)}
              >
                <span className={styles.recentName}>{s.name}</span>
                <span className={styles.recentDate}>{new Date(s.created_at).toLocaleDateString()}</span>
              </button>
              <button
                className={styles.recentMonitor}
                onClick={() => navigate(`/monitor/${s.id}`)}
                title="Open monitor"
              >
                📺
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
