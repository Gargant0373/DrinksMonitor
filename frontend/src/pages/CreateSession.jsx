import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listDrinks, addDrink, loadPresets, getSession, endSession, getSessionQRUrl } from "../api/client";
import { useTitle } from "../hooks/useTitle";
import styles from "./CreateSession.module.css";

export default function CreateSession() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [session, setSession]   = useState(null);
  useTitle(session ? `🎮 ${session.name}` : "Create Session");
  const [drinks, setDrinks]     = useState([]);
  const [form, setForm]         = useState({ name: "", volume_ml: "", alcohol_percent: "", color: "#f59e0b", icon: "🍺" });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    getSession(sessionId).then(setSession).catch(() => navigate("/"));
    listDrinks(sessionId).then(setDrinks);
  }, [sessionId]);

  async function handleLoadPresets() {
    setLoading(true);
    try {
      await loadPresets(sessionId);
      setDrinks(await listDrinks(sessionId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDrink(e) {
    e.preventDefault();
    setError("");
    try {
      await addDrink(sessionId, {
        name:            form.name,
        volume_ml:       parseFloat(form.volume_ml),
        alcohol_percent: parseFloat(form.alcohol_percent),
        color:           form.color,
        icon:            form.icon,
      });
      setDrinks(await listDrinks(sessionId));
      setForm({ name: "", volume_ml: "", alcohol_percent: "", color: "#f59e0b", icon: "🍺" });
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleEnd() {
    if (!confirm("End this session?")) return;
    await endSession(sessionId);
    navigate("/");
  }

  const joinUrl = `${window.location.origin}/join/${sessionId}`;

  return (
    <div className="page">
      <header className={styles.header}>
        <h1>{session?.name ?? "Loading…"}</h1>
        <button className="btn btn-danger" onClick={handleEnd}>End Session</button>
      </header>

      {/* QR Code */}
      <section className="card" style={{ textAlign: "center" }}>
        <p className="label">Participants scan to join</p>
        <img
          src={getSessionQRUrl(sessionId)}
          alt="Join QR Code"
          className={styles.qr}
        />
        <p className={styles.joinUrl}>{joinUrl}</p>
      </section>

      {/* Monitor link */}
      <a
        href={`/monitor/${sessionId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-full"
      >
        📺 Open Monitor Screen
      </a>

      {/* Drink definitions */}
      <section>
        <div className={styles.sectionHeader}>
          <h2>Drinks</h2>
          <button className="btn btn-ghost" onClick={handleLoadPresets} disabled={loading}>
            Load Presets
          </button>
        </div>

        <ul className={styles.drinkList}>
          {drinks.map((d) => (
            <li key={d.id} className={styles.drinkItem}>
              <span>{d.icon}</span>
              <span>{d.name}</span>
              <span className={styles.drinkMeta}>{d.volume_ml}ml · {d.alcohol_percent}%</span>
            </li>
          ))}
          {drinks.length === 0 && <li className={styles.empty}>No drinks yet — load presets or add one.</li>}
        </ul>

        <form className={styles.addForm} onSubmit={handleAddDrink}>
          <h3>Add Custom Drink</h3>
          <div className={styles.row}>
            <div style={{ flex: 2 }}>
              <label className="label">Name</label>
              <input placeholder="IPA" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Icon</label>
              <input placeholder="🍺" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
            </div>
          </div>
          <div className={styles.row}>
            <div>
              <label className="label">Volume (ml)</label>
              <input type="number" placeholder="330" value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} required min={1} />
            </div>
            <div>
              <label className="label">Alcohol %</label>
              <input type="number" placeholder="5" value={form.alcohol_percent} onChange={(e) => setForm({ ...form, alcohol_percent: e.target.value })} required min={0} max={100} step={0.1} />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ padding: "0.3rem" }} />
            </div>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary btn-full" type="submit">Add Drink</button>
        </form>
      </section>
    </div>
  );
}
