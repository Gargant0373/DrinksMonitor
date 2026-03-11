import styles from "./DrinkButton.module.css";

/**
 * A big tap-friendly drink button for the participant dashboard.
 */
export default function DrinkButton({ drink, onLog, disabled, cooldown }) {
  return (
    <button
      className={styles.btn}
      style={{ "--accent": drink.color }}
      onClick={() => onLog(drink)}
      disabled={disabled}
      aria-label={`Log ${drink.name}`}
    >
      <span className={styles.icon}>{drink.icon}</span>
      <span className={styles.name}>{drink.name}</span>
      <span className={styles.meta}>
        {drink.volume_ml} ml · {drink.alcohol_percent}%
      </span>
      {cooldown > 0 && (
        <span className={styles.cooldown}>{cooldown}s</span>
      )}
    </button>
  );
}
