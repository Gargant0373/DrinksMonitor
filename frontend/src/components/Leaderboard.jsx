import Avatar from "./Avatar";
import styles from "./Leaderboard.module.css";

export default function Leaderboard({ entries = [], large = false }) {
  return (
    <ol className={`${styles.list} ${large ? styles.large : ""}`}>
      {entries.map((entry, i) => (
        <li key={entry.participant_id} className={styles.row}>
          <span className={styles.rank}>{i + 1}</span>
          <Avatar
            participantId={entry.participant_id}
            displayName={entry.display_name}
            size={large ? 56 : 40}
          />
          <span className={styles.name}>{entry.display_name}</span>
          <span className={styles.stats}>
            <strong>{entry.points.toFixed(1)}</strong>
            <small>{entry.drink_count} 🍺</small>
          </span>
        </li>
      ))}
      {entries.length === 0 && (
        <li className={styles.empty}>No drinks logged yet</li>
      )}
    </ol>
  );
}
