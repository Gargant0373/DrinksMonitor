import { useState, useEffect, useCallback } from "react";
import { photoUrl } from "../api/client";
import styles from "./PhotoFeed.module.css";

// Detect landscape vs portrait from a loaded <img> element
function useOrientation(src) {
  const [orient, setOrient] = useState("square");
  const onLoad = useCallback((e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setOrient(w / h > 1.2 ? "landscape" : h / w > 1.2 ? "portrait" : "square");
  }, []);
  return [orient, onLoad];
}

function PhotoCard({ photo, featured, spotlight }) {
  const [orient, onLoad] = useOrientation(photoUrl(photo.photo_id));
  return (
    <div
      className={[
        styles.card,
        featured  ? styles.featured  : "",
        spotlight ? styles.spotlight : "",
        styles[orient],
      ].join(" ")}
    >
      <img
        className={styles.img}
        src={photoUrl(photo.photo_id)}
        alt={photo.caption || photo.display_name}
        onLoad={onLoad}
      />
      <div className={styles.overlay}>
        <span className={styles.author}>{photo.display_name}</span>
        {photo.caption && <span className={styles.caption}>"{photo.caption}"</span>}
        {photo.vote_count > 0 && <span className={styles.votes}>❤️ {photo.vote_count}</span>}
      </div>
    </div>
  );
}

export default function PhotoFeed({ photos = [] }) {
  // Sort by votes desc, take up to 7
  const sorted = [...photos].sort((a, b) => b.vote_count - a.vote_count).slice(0, 7);
  // Cycle spotlight index through remaining photos every 4s
  const [spotIdx, setSpotIdx] = useState(0);
  useEffect(() => {
    if (sorted.length <= 1) return;
    const t = setInterval(() => setSpotIdx((i) => (i + 1) % sorted.length), 4000);
    return () => clearInterval(t);
  }, [sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>📸 No snaps yet — someone take a photo!</p>
      </div>
    );
  }

  const [hero, ...rest] = sorted;

  return (
    <div className={styles.wrap}>
      <div className={styles.bento} data-count={sorted.length}>
        {/* Hero — always top-voted, large */}
        <PhotoCard photo={hero} featured spotlight={spotIdx === 0} />
        {rest.map((p, i) => (
          <PhotoCard key={p.photo_id} photo={p} spotlight={spotIdx === i + 1} />
        ))}
      </div>
    </div>
  );
}
