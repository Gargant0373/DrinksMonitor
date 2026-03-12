import { useState, useEffect, useRef } from "react";
import { photoUrl } from "../api/client";
import styles from "./PhotoFeed.module.css";

function PhotoCard({ photo, large }) {
  const [orient, setOrient] = useState("square");
  function onLoad(e) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setOrient(w / h > 1.15 ? "landscape" : h / w > 1.15 ? "portrait" : "square");
  }
  return (
    <div className={`${styles.card} ${large ? styles.large : styles.small} ${styles[orient]}`}>
      <img
        className={styles.img}
        src={photoUrl(photo.photo_id)}
        alt={photo.caption || photo.display_name}
        onLoad={onLoad}
        loading="lazy"
      />
      <div className={styles.overlay}>
        <span className={styles.author}>{photo.display_name}</span>
        {photo.caption && <span className={styles.caption}>"{photo.caption}"</span>}
        {photo.vote_count > 0 && <span className={styles.votes}>❤️ {photo.vote_count}</span>}
      </div>
    </div>
  );
}

// Pick n random items from array, excluding ids already in `exclude`
function pickRandom(pool, n, excludeIds) {
  const eligible = pool.filter((p) => !excludeIds.has(p.photo_id));
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function PhotoFeed({ photos = [] }) {
  // Normalise: backend may return 'id' or 'photo_id'
  const normalized = (photos ?? []).map((p) => ({ ...p, photo_id: p.photo_id ?? p.id }));

  // Sort by taken_at desc to get newest first
  const byTime = [...normalized].sort((a, b) =>
    (b.taken_at ?? "").localeCompare(a.taken_at ?? "")
  );

  const newest = byTime.slice(0, 2);
  const newestIds = new Set(newest.map((p) => p.photo_id));

  // Pick 2 random fillers, re-randomise every 8s
  const [fillers, setFillers] = useState(() => pickRandom(byTime, 2, newestIds));
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    const t = setInterval(() => {
      const all = [...photosRef.current].sort((a, b) =>
        (b.taken_at ?? "").localeCompare(a.taken_at ?? "")
      );
      const top2Ids = new Set(all.slice(0, 2).map((p) => p.photo_id));
      setFillers(pickRandom(all, 2, top2Ids));
    }, 8000);
    return () => clearInterval(t);
  }, []);

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>📸 No snaps yet — someone take a photo!</p>
      </div>
    );
  }

  // Pad newest to 2 slots (repeat if only 1 photo)
  const leftSlots = newest.length === 1 ? [newest[0], newest[0]] : newest;
  // Pad fillers to 2 slots
  const rightSlots = fillers.length === 0
    ? [newest[0], newest[newest.length - 1]]
    : fillers.length === 1
    ? [fillers[0], newest[0]]
    : fillers;

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {/* Left column: 2 newest, large */}
        <div className={styles.col}>
          {leftSlots.map((p, i) => <PhotoCard key={`l${i}-${p.photo_id}`} photo={p} large />)}
        </div>
        {/* Right column: 2 random, smaller */}
        <div className={styles.col}>
          {rightSlots.map((p, i) => <PhotoCard key={`r${i}-${p.photo_id}`} photo={p} />)}
        </div>
      </div>
    </div>
  );
}
