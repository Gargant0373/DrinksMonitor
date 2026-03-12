import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listDrinks, logDrink, deleteDrink, getStats } from "../api/client";
import { getParticipantId, getLastLogId, setLastLogId } from "../utils/identity";
import { usePolling } from "../hooks/usePolling";
import { useTitle } from "../hooks/useTitle";
import CrashBanner from "../components/CrashBanner";
import DrinkButton from "../components/DrinkButton";
import Leaderboard from "../components/Leaderboard";
import EditProfile from "../components/EditProfile";
import SnapButton from "../components/SnapButton";
import VoteModal from "../components/VoteModal";
import styles from "./ParticipantDashboard.module.css";

const RATE_LIMIT_SECONDS = 5;

export default function ParticipantDashboard() {
  const { sessionId }   = useParams();
  const participantId   = getParticipantId(sessionId);
  const navigate        = useNavigate();

  const [drinks, setDrinks]             = useState([]);
  const [cooldown, setCooldown]         = useState(0);
  const [feedback, setFeedback]         = useState(null); // { text, type }
  const [lastLogId, setLocalLastLogId]  = useState(() => getLastLogId(sessionId));
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [pendingVoteLogId, setPendingVoteLogId] = useState(null);

  const { data: stats } = usePolling(
    useCallback(() => getStats(sessionId), [sessionId]),
    3000,
  );

  useTitle(stats?.session?.name ? `🍺 ${stats.session.name}` : "Dashboard");

  useEffect(() => {
    listDrinks(sessionId).then(setDrinks);
  }, [sessionId]);

  // Countdown timer for rate limit
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleLog(drink) {
    if (cooldown > 0 || !participantId) return;
    try {
      const res = await logDrink(sessionId, participantId, drink.id);
      setLastLogId(sessionId, res.log_id);
      setLocalLastLogId(res.log_id);
      setCooldown(RATE_LIMIT_SECONDS);
      setFeedback({
        text: `+${res.points_earned.toFixed(2)} pts ${res.during_crash ? "⚡×2" : ""}`,
        type: res.during_crash ? "crash" : "ok",
      });
      setTimeout(() => setFeedback(null), 2000);
      setPendingVoteLogId(res.log_id);
    } catch (err) {
      setFeedback({ text: err.message, type: "error" });
      setTimeout(() => setFeedback(null), 2500);
    }
  }

  async function handleUndo() {
    if (!lastLogId || !participantId) return;
    try {
      await deleteDrink(lastLogId, participantId);
      setLastLogId(sessionId, null);
      setLocalLastLogId(null);
      setFeedback({ text: "Drink removed", type: "ok" });
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback({ text: err.message, type: "error" });
      setTimeout(() => setFeedback(null), 2500);
    }
  }

  const myEntry = stats?.leaderboard?.find((e) => e.participant_id === participantId);

  return (
    <div className={styles.wrapper}>
      <CrashBanner active={stats?.crash_active} />

      {showEditProfile && (
        <EditProfile
          participantId={participantId}
          currentName={myEntry?.display_name ?? ""}
          onSaved={() => setShowEditProfile(false)}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      {pendingVoteLogId && (
        <VoteModal
          sessionId={sessionId}
          voterId={participantId}
          drinkLogId={pendingVoteLogId}
          onDone={() => setPendingVoteLogId(null)}
        />
      )}

      {/* My stats */}
      <div className={styles.myStats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{myEntry?.drink_count ?? 0}</span>
          <span className={styles.statLabel}>Drinks</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{myEntry?.points?.toFixed(1) ?? "0.0"}</span>
          <span className={styles.statLabel}>Points</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{myEntry?.bac?.toFixed(3) ?? "0.000"}‰</span>
          <span className={styles.statLabel}>BAC</span>
        </div>
      </div>

      <button className={`btn btn-ghost ${styles.editProfileBtn}`} onClick={() => setShowEditProfile(true)}>
        ✏️ Edit Profile
      </button>

      {/* Feedback toast */}
      {feedback && (
        <div className={`${styles.toast} ${styles[`toast_${feedback.type}`]}`}>
          {feedback.text}
        </div>
      )}

      {/* Drink buttons */}
      <section>
        <h2 className={styles.sectionTitle}>Log a drink</h2>
        <div className={styles.drinkGrid}>
          {drinks.map((d) => (
            <DrinkButton
              key={d.id}
              drink={d}
              onLog={handleLog}
              disabled={cooldown > 0}
              cooldown={cooldown > 0 ? cooldown : 0}
            />
          ))}
          {drinks.length === 0 && (
            <p style={{ color: "var(--muted)", gridColumn: "1/-1" }}>
              No drinks configured yet. Ask the host to add some.
            </p>
          )}
        </div>
      </section>

      {/* Undo */}
      {lastLogId && (
        <button className="btn btn-ghost btn-full" onClick={handleUndo}>
          ↩ Undo last drink
        </button>
      )}

      {/* Snap */}
      <SnapButton
        sessionId={sessionId}
        participantId={participantId}
        onSnapped={() => setFeedback({ text: "📸 Snap posted!", type: "ok" })}
      />

      {/* Gallery link */}
      <button
        className={`btn btn-ghost btn-full ${styles.galleryBtn}`}
        onClick={() => navigate(`/session/${sessionId}/gallery`)}
      >
        🖼️ View all photos
      </button>

      {/* Mini leaderboard */}
      <section>
        <h2 className={styles.sectionTitle}>Leaderboard</h2>
        <Leaderboard entries={stats?.leaderboard ?? []} />
      </section>
    </div>
  );
}
