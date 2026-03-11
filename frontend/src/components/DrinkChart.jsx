import styles from "./DrinkChart.module.css";

const COLORS = ["#f59e0b", "#7c3aed", "#ef4444", "#10b981", "#3b82f6", "#ec4899"];

export default function DrinkChart({ distribution = [] }) {
  if (distribution.length === 0) {
    return <p style={{ color: "var(--muted)", textAlign: "center", paddingTop: "2rem" }}>No drinks yet</p>;
  }

  const max = distribution[0].count; // already sorted desc from backend

  return (
    <div className={styles.chart}>
      {distribution.map((entry, i) => {
        const color = COLORS[i % COLORS.length];
        const pct   = Math.round(entry.percent);
        const barW  = Math.max((entry.count / max) * 100, 2);

        return (
          <div key={entry.name} className={styles.row}>
            {/* Label */}
            <span className={styles.label}>{entry.name}</span>

            {/* Bar track */}
            <div className={styles.track}>
              <div
                className={styles.bar}
                style={{ width: `${barW}%`, background: color }}
              />
            </div>

            {/* Stats */}
            <span className={styles.stats}>
              <strong style={{ color }}>{pct}%</strong>
              <span className={styles.count}>{entry.count}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
