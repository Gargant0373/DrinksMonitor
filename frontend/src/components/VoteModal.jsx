import { useState, useEffect } from "react";
import { getVotePair, castVote, photoUrl } from "../api/client";
import styles from "./VoteModal.module.css";

export default function VoteModal({ sessionId, voterId, drinkLogId, onDone }) {
  const [pair, setPair]       = useState(null);   // [{photo_id,display_name,caption}]
  const [voted, setVoted]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!drinkLogId) { onDone(); return; }
    getVotePair(sessionId, voterId, drinkLogId)
      .then((res) => {
        if (res.pair?.length === 2) setPair(res.pair);
        else onDone(); // not enough photos — skip silently
      })
      .catch(() => onDone())
      .finally(() => setLoading(false));
  }, [sessionId, voterId, drinkLogId]);

  async function handleVote(photoId) {
    setVoted(true);
    try {
      await castVote(sessionId, voterId, photoId, drinkLogId);
    } catch {
      // Already voted or error — still close
    }
    setTimeout(onDone, 600);
  }

  if (loading || !pair) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>🗳️ Vote for the best pic!</h3>
        <p className={styles.sub}>Tap the photo you like most</p>

        <div className={styles.pair}>
          {pair.map((photo) => (
            <button
              key={photo.id}
              className={`${styles.card} ${voted ? styles.disabled : ""}`}
              onClick={() => !voted && handleVote(photo.id)}
            >
              <img
                className={styles.photo}
                src={photoUrl(photo.id)}
                alt={photo.caption || photo.display_name}
              />
              <div className={styles.info}>
                <span className={styles.author}>{photo.display_name}</span>
                {photo.caption && <span className={styles.caption}>"{photo.caption}"</span>}
              </div>
            </button>
          ))}
        </div>

        <button className={styles.skipBtn} onClick={onDone}>Skip</button>
      </div>
    </div>
  );
}
