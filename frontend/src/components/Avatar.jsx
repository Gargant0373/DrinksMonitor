import { avatarUrl } from "../api/client";
import styles from "./Avatar.module.css";

export default function Avatar({ participantId, displayName, size = 44 }) {
  return (
    <img
      className={styles.avatar}
      src={avatarUrl(participantId)}
      alt={displayName}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a1a24&color=f59e0b&size=128`;
      }}
    />
  );
}
