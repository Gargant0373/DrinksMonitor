import { useState, useRef } from "react";
import { updateParticipant, uploadAvatar, avatarUrl } from "../api/client";
import styles from "./EditProfile.module.css";

export default function EditProfile({ participantId, currentName, onSaved, onClose }) {
  const [name, setName]       = useState(currentName ?? "");
  const [preview, setPreview] = useState(null);
  const [blob, setBlob]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const fileRef               = useRef();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlob(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name can't be empty"); return; }
    setSaving(true);
    setError("");
    try {
      await updateParticipant(participantId, name.trim());
      if (blob) await uploadAvatar(participantId, blob);
      onSaved(name.trim());
    } catch (err) {
      setError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <h2 className={styles.title}>Edit Profile</h2>

        {/* Avatar */}
        <div className={styles.avatarWrap} onClick={() => fileRef.current.click()}>
          <img
            className={styles.avatar}
            src={preview ?? `${avatarUrl(participantId)}?t=${Date.now()}`}
            alt="avatar"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <span className={styles.avatarHint}>Tap to change</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

        {/* Name */}
        <label className={styles.label}>Display name</label>
        <input
          className={styles.input}
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
