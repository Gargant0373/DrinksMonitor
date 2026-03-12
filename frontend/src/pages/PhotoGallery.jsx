import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listPhotos, photoUrl } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useTitle } from "../hooks/useTitle";
import styles from "./PhotoGallery.module.css";

function OrientedCard({ photo, onClick }) {
  const [orient, setOrient] = useState("square");

  function onLoad(e) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setOrient(w / h > 1.2 ? "landscape" : h / w > 1.2 ? "portrait" : "square");
  }

  return (
    <div
      className={`${styles.card} ${styles[orient]}`}
      onClick={() => onClick(photo)}
    >
      <img
        className={styles.thumb}
        src={photoUrl(photo.photo_id)}
        alt={photo.caption || photo.display_name}
        onLoad={onLoad}
        loading="lazy"
      />
      <div className={styles.cardOverlay}>
        <span className={styles.cardAuthor}>{photo.display_name}</span>
        {photo.caption && <span className={styles.cardCaption}>"{photo.caption}"</span>}
        {photo.vote_count > 0 && <span className={styles.cardVotes}>❤️ {photo.vote_count}</span>}
      </div>
    </div>
  );
}

function Lightbox({ photo, onClose, onPrev, onNext }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft")  onPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className={styles.lightbox} onClick={onClose}>
      <button className={styles.lbClose} onClick={onClose}>✕</button>
      <button className={styles.lbPrev} onClick={(e) => { e.stopPropagation(); onPrev(); }}>‹</button>
      <div className={styles.lbContent} onClick={(e) => e.stopPropagation()}>
        <img
          className={styles.lbImg}
          src={photoUrl(photo.photo_id)}
          alt={photo.caption || photo.display_name}
        />
        <div className={styles.lbMeta}>
          <span className={styles.lbAuthor}>{photo.display_name}</span>
          {photo.caption && <span className={styles.lbCaption}>"{photo.caption}"</span>}
          {photo.vote_count > 0 && <span className={styles.lbVotes}>❤️ {photo.vote_count} votes</span>}
        </div>
      </div>
      <button className={styles.lbNext} onClick={(e) => { e.stopPropagation(); onNext(); }}>›</button>
    </div>
  );
}

export default function PhotoGallery() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [sort, setSort] = useState("recent"); // recent | votes

  const { data: photos = [] } = usePolling(
    useCallback(() => listPhotos(sessionId), [sessionId]),
    5000,
  );

  useTitle("📸 Gallery");

  const sorted = [...photos].sort((a, b) =>
    sort === "votes"
      ? b.vote_count - a.vote_count
      : new Date(b.taken_at) - new Date(a.taken_at)
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
        <h1 className={styles.title}>📸 Night Gallery</h1>
        <div className={styles.sortBtns}>
          <button
            className={`${styles.sortBtn} ${sort === "recent" ? styles.sortActive : ""}`}
            onClick={() => setSort("recent")}
          >
            Recent
          </button>
          <button
            className={`${styles.sortBtn} ${sort === "votes" ? styles.sortActive : ""}`}
            onClick={() => setSort("votes")}
          >
            ❤️ Top
          </button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <p>No snaps yet — be the first to take one! 📸</p>
        </div>
      ) : (
        <div className={styles.masonry}>
          {sorted.map((photo, i) => (
            <OrientedCard key={photo.photo_id} photo={photo} onClick={() => setLightboxIdx(i)} />
          ))}
        </div>
      )}

      {lightboxIdx !== null && sorted[lightboxIdx] && (
        <Lightbox
          photo={sorted[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i - 1 + sorted.length) % sorted.length)}
          onNext={() => setLightboxIdx((i) => (i + 1) % sorted.length)}
        />
      )}
    </div>
  );
}
