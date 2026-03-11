import { photoUrl } from "../api/client";
import styles from "./PhotoFeed.module.css";

export default function PhotoFeed({ photos = [] }) {
  // Show up to 6 most-voted recent photos in a grid
  const sorted = [...photos].sort((a, b) => b.vote_count - a.vote_count).slice(0, 6);

  if (sorted.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>📸 No snaps yet — someone take a photo!</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>📸 Night Snaps</h2>
      <div className={`${styles.grid} ${styles[`grid${sorted.length}`]}`}>
        {sorted.map((photo) => (
          <div key={photo.photo_id} className={styles.card}>
            <img
              className={styles.img}
              src={photoUrl(photo.photo_id)}
              alt={photo.caption || photo.display_name}
            />
            <div className={styles.overlay}>
              <span className={styles.author}>{photo.display_name}</span>
              {photo.caption && <span className={styles.caption}>"{photo.caption}"</span>}
              {photo.vote_count > 0 && (
                <span className={styles.votes}>❤️ {photo.vote_count}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
