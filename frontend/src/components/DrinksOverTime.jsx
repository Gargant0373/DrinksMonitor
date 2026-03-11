import styles from "./DrinksOverTime.module.css";

const MAX_BARS    = 24;
const SVG_H       = 160;  // viewBox height for bars
const BAR_PADDING = 0.25; // fraction of slot kept as gap

export default function DrinksOverTime({ data = [] }) {
  const visible = data.slice(-MAX_BARS);
  const peak    = Math.max(1, ...visible.map((d) => d.count));
  const n       = visible.length || 1;
  const slotW   = 100 / n;
  const barW    = slotW * (1 - BAR_PADDING);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>📈 Drinks Over Time</h2>

      {visible.length === 0 ? (
        <p className={styles.empty}>No drinks yet — start drinking! 🎉</p>
      ) : (
        <div className={styles.chartArea}>
          <svg
            className={styles.svg}
            viewBox={`0 0 100 ${SVG_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%"   stopColor="var(--primary, #7c3aed)" />
                <stop offset="100%" stopColor="var(--accent,  #a78bfa)" />
              </linearGradient>
            </defs>
            {visible.map((bucket, i) => {
              const barH = Math.max(2, (bucket.count / peak) * SVG_H);
              const x    = i * slotW + (slotW - barW) / 2;
              const y    = SVG_H - barH;
              return (
                <rect key={i} x={x} y={y} width={barW} height={barH} rx={2} fill="url(#barGrad)">
                  <title>{bucket.count} drink{bucket.count !== 1 ? "s" : ""}</title>
                </rect>
              );
            })}
          </svg>

          <div className={styles.counts}>
            {visible.map((bucket, i) => (
              <span key={i} className={styles.countLabel}>
                {bucket.count > 0 ? bucket.count : ""}
              </span>
            ))}
          </div>

          <div className={styles.xAxis}>
            {visible.map((bucket, i) => (
              <span key={i} className={styles.xLabel}>{bucket.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
