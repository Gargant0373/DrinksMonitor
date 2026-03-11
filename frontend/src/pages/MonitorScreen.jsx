import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { useTitle } from "../hooks/useTitle";
import { getStats, getSessionQRUrl } from "../api/client";
import CrashBanner from "../components/CrashBanner";
import Leaderboard from "../components/Leaderboard";
import DrinkChart from "../components/DrinkChart";
import BACDisplay from "../components/BACDisplay";
import Avatar from "../components/Avatar";
import ActivityFeed from "../components/ActivityFeed";
import DrinksOverTime from "../components/DrinksOverTime";
import PhotoFeed from "../components/PhotoFeed";
import styles from "./MonitorScreen.module.css";

const SCREENS = ["leaderboard", "distribution", "bac", "drunkest", "overtime", "photos"];
const ROTATE_INTERVAL_MS = 20_000;

export default function MonitorScreen() {
  const { sessionId } = useParams();
  const [screenIdx, setScreenIdx] = useState(0);
  const [progress, setProgress]   = useState(0);
  // Two slots for crossfade: current (visible) and next (fading in)
  const [visible, setVisible]     = useState(0); // which slot is on top
  const [slots, setSlots]         = useState([SCREENS[0], SCREENS[1]]);
  const startRef = useRef(Date.now());

  const { data: stats } = usePolling(
    useCallback(() => getStats(sessionId), [sessionId]),
    3000,
  );

  useTitle(stats?.session?.name ? `📺 ${stats.session.name}` : "Monitor");

  useEffect(() => {
    startRef.current = Date.now();

    const tick = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) % ROTATE_INTERVAL_MS;
      setProgress(elapsed / ROTATE_INTERVAL_MS);
    }, 100);

    const rotate = setInterval(() => {
      startRef.current = Date.now();
      setProgress(0);
      setScreenIdx((prev) => {
        const next = (prev + 1) % SCREENS.length;
        const nextNext = (next + 1) % SCREENS.length;
        // Load the incoming screen into the hidden slot, then flip
        setSlots([SCREENS[next], SCREENS[nextNext]]);
        setVisible(0);
        return next;
      });
    }, ROTATE_INTERVAL_MS);

    return () => { clearInterval(tick); clearInterval(rotate); };
  }, []);

  const currentScreen = SCREENS[screenIdx];
  const drunkest = stats?.bac_ranking?.[0];

  function renderScreen(screen) {
    switch (screen) {
      case "leaderboard":
        return <Leaderboard entries={stats?.leaderboard ?? []} large />;
      case "distribution":
        return <DrinkChart distribution={stats?.drink_distribution ?? []} />;
      case "bac":
        return <BACDisplay ranking={stats?.bac_ranking ?? []} large />;
      case "drunkest":
        return drunkest ? (
          <div className={styles.drunkest}>
            <Avatar participantId={drunkest.participant_id} displayName={drunkest.display_name} size={160} />
            <p className={styles.drunkestName}>{drunkest.display_name}</p>
            <p className={styles.drunkestBac}>{drunkest.bac.toFixed(3)}‰</p>
            <p className={styles.drunkestLabel}>👑 Drunkest Player</p>
          </div>
        ) : <Leaderboard entries={stats?.leaderboard ?? []} large />;
      case "overtime":
        return <DrinksOverTime data={stats?.drinks_over_time ?? []} />;
      case "photos":
        return <PhotoFeed photos={stats?.recent_photos ?? []} />;
      default:
        return null;
    }
  }

  return (
    <div className={styles.monitor}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.sessionName}>{stats?.session?.name ?? "Loading…"}</h1>
          <span className={styles.screenName}>{LABEL[currentScreen]}</span>
        </div>
        {stats?.crash_active && <CrashBanner active />}
      </header>

      {/* ── Body: activity feed + content + QR sidebar ── */}
      <div className={styles.body}>
        {/* Left: live activity feed */}
        <ActivityFeed logs={stats?.recent_logs ?? []} />

        {/* Centre: rotating screen */}
        <div className={styles.contentWrap}>
          <div className={`${styles.slide} ${styles.slideActive}`}>
            {renderScreen(currentScreen)}
          </div>
        </div>

        {/* QR sidebar — always visible */}
        <aside className={styles.qrSidebar}>
          <p className={styles.qrLabel}>Scan to join</p>
          <img
            className={styles.qrImage}
            src={getSessionQRUrl(sessionId)}
            alt="Join QR code"
          />
          <p className={styles.qrCode}>{sessionId.slice(0, 8).toUpperCase()}</p>
        </aside>
      </div>

      {/* ── Footer: progress bar + dots ── */}
      <footer className={styles.footer}>
        <div className={styles.dots}>
          {SCREENS.map((s, i) => (
            <span
              key={s}
              className={`${styles.dot} ${i === screenIdx ? styles.dotActive : ""}`}
            />
          ))}
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${progress * 100}%`, transition: progress === 0 ? "none" : "width 0.1s linear" }}
          />
        </div>
      </footer>
    </div>
  );
}

const LABEL = {
  leaderboard:  "🏆 Leaderboard",
  distribution: "🍹 Drink Distribution",
  bac:          "🧪 BAC Ranking",
  drunkest:     "👑 Drunkest Player",
  overtime:     "📈 Drinks Over Time",
  photos:       "📸 Night Snaps",
};
