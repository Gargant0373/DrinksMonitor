import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinSession, uploadAvatar } from "../api/client";
import { getParticipantId, setParticipantId } from "../utils/identity";
import { useTitle } from "../hooks/useTitle";
import styles from "./JoinSession.module.css";

export default function JoinSession() {
  const { sessionId } = useParams();
  useTitle("Join Session");
  const navigate      = useNavigate();

  // If we already have a participant ID for this session, go straight to dashboard
  useEffect(() => {
    const existing = getParticipantId(sessionId);
    if (existing) navigate(`/session/${sessionId}/dashboard`, { replace: true });
  }, [sessionId]);

  const [step, setStep]             = useState("form"); // form | avatar
  const [displayName, setDisplayName] = useState("");
  const [weightKg, setWeightKg]     = useState("");
  const [gender, setGender]         = useState("other");
  const [participantId, setLocalPid] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef  = useRef(null);
  const videoRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { participant_id } = await joinSession(sessionId, {
        display_name:   displayName.trim(),
        weight_kg:      weightKg ? parseFloat(weightKg) : null,
        gender,
        participant_id: getParticipantId(sessionId) ?? undefined, // send existing id if any
      });
      setParticipantId(sessionId, participant_id);
      setLocalPid(participant_id);
      setStep("avatar");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function openCamera() {
    setCameraOpen(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  }

  function capturePhoto() {
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setAvatarPreview(url);
      // store blob for upload
      fileRef._capturedBlob = blob;
    }, "image/jpeg", 0.85);
    videoRef.current.srcObject?.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  }

  async function handleAvatarUpload() {
    if (!avatarPreview) {
      navigate(`/session/${sessionId}/dashboard`);
      return;
    }

    let blob;
    if (fileRef._capturedBlob) {
      blob = fileRef._capturedBlob;
    } else {
      const file = fileRef.current?.files[0];
      if (file) blob = file;
    }

    if (blob) {
      try {
        await uploadAvatar(participantId, blob);
      } catch (_) { /* avatar is optional */ }
    }
    navigate(`/session/${sessionId}/dashboard`);
  }

  if (step === "avatar") {
    return (
      <div className="page">
        <h1 className={styles.title}>Add a photo 📸</h1>
        <p style={{ color: "var(--muted)" }}>Optional — shown on the leaderboard.</p>

        {avatarPreview ? (
          <img src={avatarPreview} alt="preview" className={styles.preview} />
        ) : cameraOpen ? (
          <video ref={videoRef} className={styles.preview} playsInline />
        ) : (
          <div className={styles.placeholder}>No photo yet</div>
        )}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-ghost btn-full" onClick={openCamera}>📷 Camera</button>
          <button className="btn btn-ghost btn-full" onClick={() => fileRef.current.click()}>🖼 Upload</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

        {cameraOpen && (
          <button className="btn btn-primary btn-full" onClick={capturePhoto}>Take Photo</button>
        )}

        <button className="btn btn-primary btn-full" onClick={handleAvatarUpload}>
          {avatarPreview ? "Save & Enter" : "Skip & Enter"}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className={styles.title}>Join Session 🎉</h1>
      <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label className="label" htmlFor="dname">Display Name</label>
          <input id="dname" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={32} />
        </div>
        <div>
          <label className="label" htmlFor="weight">Weight (kg) — for BAC estimate</label>
          <input id="weight" type="number" placeholder="70" min={30} max={300} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="gender">Gender</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other / Prefer not to say</option>
          </select>
        </div>
        {error && <p className="error-msg">{error}</p>}
        <button className="btn btn-primary btn-full" disabled={loading || !displayName.trim()}>
          {loading ? "Joining…" : "Join 🍻"}
        </button>
      </form>
    </div>
  );
}
