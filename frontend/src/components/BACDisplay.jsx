import Avatar from "./Avatar";
import styles from "./BACDisplay.module.css";

export default function BACDisplay({ ranking = [], large = false }) {
  return (
    <ol className={`${styles.list} ${large ? styles.large : ""}`}>
      {ranking.map((entry, i) => (
        <li key={entry.participant_id} className={styles.row}>
          <span className={styles.rank}>{i + 1}</span>
          <Avatar
            participantId={entry.participant_id}
            displayName={entry.display_name}
            size={large ? 56 : 40}
          />
          <span className={styles.name}>{entry.display_name}</span>
          <span className={styles.bac} data-level={bacLevel(entry.bac)}>
            {entry.bac.toFixed(3)}‰
          </span>
        </li>
      ))}
      {ranking.length === 0 && (
        <li className={styles.empty}>No BAC data</li>
      )}
    </ol>
  );
}

function bacLevel(bac) {
  if (bac >= 0.15) return "danger";
  if (bac >= 0.08) return "warn";
  return "ok";
}
