import { formatDistanceToNow } from "date-fns";
import styles from "./ActivityFeed.module.css";

const MAX_VISIBLE = 12;

function relativeTime(isoStr) {
  try {
    return formatDistanceToNow(new Date(isoStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function ActivityFeed({ logs = [] }) {
  const visible = logs.slice(0, MAX_VISIBLE);

  return (
    <aside className={styles.feed}>
      <h3 className={styles.title}>🍸 Activity</h3>
      <ul className={styles.list}>
        {visible.length === 0 && (
          <li className={styles.empty}>No drinks yet…</li>
        )}
        {visible.map((log, i) => (
          <li key={i} className={styles.item}>
            <span
              className={styles.icon}
              style={{ background: log.color ?? "#555" }}
            >
              {log.icon ?? "🍺"}
            </span>
            <div className={styles.info}>
              <span className={styles.sentence}>
                <strong>{log.display_name}</strong>
                {" drank a "}
                <em>{log.drink_name}</em>
              </span>
              <span className={styles.time}>{relativeTime(log.logged_at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
