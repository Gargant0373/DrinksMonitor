import styles from "./CrashBanner.module.css";

export default function CrashBanner({ active }) {
  if (!active) return null;
  return (
    <div className={styles.banner}>
      <span className={styles.icon}>⚡</span>
      CRASH EVENT — 2× POINTS ACTIVE
      <span className={styles.icon}>⚡</span>
    </div>
  );
}
