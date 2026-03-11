import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../api/client";
import { useTitle } from "../hooks/useTitle";
import styles from "./Home.module.css";

export default function Home() {
  useTitle(null); // shows base title: 🍺 DrinksMonitor
  const navigate = useNavigate();
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { session_id } = await createSession(name.trim());
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
    </div>
  );
}
