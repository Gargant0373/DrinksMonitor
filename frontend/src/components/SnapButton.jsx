import { useState, useRef } from "react";
import { uploadPhoto } from "../api/client";
import styles from "./SnapButton.module.css";

export default function SnapButton({ sessionId, participantId, onSnapped }) {
  const [stage, setStage]     = useState("idle"); // idle | preview | uploading
  const [blob, setBlob]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [error, setError]     = useState("");
  const fileRef               = useRef();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlob(file);
    setPreview(URL.createObjectURL(file));
    setCaption("");
    setError("");
    setStage("preview");
  }

  async function handleSubmit() {
    if (!blob) return;
    setStage("uploading");
    setError("");
    try {
      const res = await uploadPhoto(sessionId, participantId, blob, caption);
      onSnapped?.(res);
      setStage("idle");
      setBlob(null);
      setPreview(null);
      setCaption("");
    } catch (err) {
      setError(err.message ?? "Upload failed");
      setStage("preview");
    }
  }

  function handleDiscard() {
    setStage("idle");
    setBlob(null);
    setPreview(null);
    setCaption("");
    setError("");
  }

  return (
    <>
      <button className={styles.snapBtn} onClick={() => fileRef.current.click()}>
        📸 Snap
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />

      {stage !== "idle" && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleDiscard()}>
          <div className={styles.modal}>
            <button className={styles.close} onClick={handleDiscard}>✕</button>
            <h3 className={styles.title}>📸 Share a snap</h3>

            <img className={styles.preview} src={preview} alt="snap preview" />

            <input
              className={styles.captionInput}
              placeholder="Add a caption… (optional)"
              value={caption}
              maxLength={120}
              onChange={(e) => setCaption(e.target.value)}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button className={styles.discardBtn} onClick={handleDiscard}>Discard</button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={stage === "uploading"}
              >
                {stage === "uploading" ? "Uploading…" : "Post +pts"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
