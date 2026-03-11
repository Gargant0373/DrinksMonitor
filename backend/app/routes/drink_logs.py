"""
Drink log routes.

POST /drink               – log a drink
DELETE /drink/<id>        – remove the participant's most recent drink (only their own)
GET  /sessions/<id>/logs  – get all drink logs for a session
"""

import uuid
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify

from app.models.database import get_db
from app.services.scoring import compute_points, is_crash_active

drink_logs_bp = Blueprint("drink_logs", __name__)

RATE_LIMIT_SECONDS = 5  # minimum gap between drinks


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@drink_logs_bp.post("/drink")
def log_drink():
    data = request.get_json(force=True)
    participant_id = data.get("participant_id")
    drink_id = data.get("drink_id")
    session_id = data.get("session_id")

    if not all([participant_id, drink_id, session_id]):
        return jsonify({"error": "participant_id, drink_id and session_id are required"}), 400

    db = get_db()

    # Validate participant belongs to session
    participant = db.execute(
        "SELECT * FROM participants WHERE id = ? AND session_id = ?",
        (participant_id, session_id),
    ).fetchone()
    if not participant:
        return jsonify({"error": "participant not found in session"}), 404

    # Validate drink belongs to session
    drink = db.execute(
        "SELECT * FROM drinks WHERE id = ? AND session_id = ?",
        (drink_id, session_id),
    ).fetchone()
    if not drink:
        return jsonify({"error": "drink not found in session"}), 404

    # Rate limit + gap calculation: fetch last log timestamp
    last_log = db.execute(
        """SELECT logged_at FROM drink_logs
           WHERE participant_id = ? AND session_id = ? ORDER BY logged_at DESC LIMIT 1""",
        (participant_id, session_id),
    ).fetchone()

    now = datetime.now(timezone.utc)
    gap_seconds = None

    if last_log:
        last_ts = datetime.fromisoformat(last_log["logged_at"].replace("Z", "+00:00"))
        if last_ts.tzinfo is None:
            last_ts = last_ts.replace(tzinfo=timezone.utc)
        diff = (now - last_ts).total_seconds()
        if diff < RATE_LIMIT_SECONDS:
            return jsonify({"error": "rate limited", "retry_after_seconds": RATE_LIMIT_SECONDS}), 429
        gap_seconds = diff

    # Check crash status
    crash_events = db.execute(
        "SELECT starts_at, ends_at FROM crash_events WHERE session_id = ?", (session_id,)
    ).fetchall()
    during_crash = is_crash_active([dict(e) for e in crash_events])

    # Count drinks already logged this session for fatigue penalty
    drink_count = db.execute(
        "SELECT COUNT(*) FROM drink_logs WHERE participant_id = ? AND session_id = ?",
        (participant_id, session_id),
    ).fetchone()[0]

    points = compute_points(drink_count, gap_seconds=gap_seconds, during_crash=during_crash)

    log_id = str(uuid.uuid4())
    now_iso = now.isoformat()

    db.execute(
        "INSERT INTO drink_logs (id, session_id, participant_id, drink_id, logged_at) VALUES (?,?,?,?,?)",
        (log_id, session_id, participant_id, drink_id, now_iso),
    )
    db.execute(
        "UPDATE sessions SET last_activity_at = ? WHERE id = ?",
        (now_iso, session_id),
    )
    db.commit()

    return jsonify({
        "log_id": log_id,
        "points_earned": points,
        "during_crash": during_crash,
        "gap_seconds": gap_seconds,
    }), 201


@drink_logs_bp.delete("/drink/<log_id>")
def delete_drink(log_id: str):
    data = request.get_json(force=True, silent=True) or {}
    participant_id = data.get("participant_id")
    if not participant_id:
        return jsonify({"error": "participant_id is required"}), 400

    db = get_db()

    # Find the log
    log = db.execute(
        "SELECT * FROM drink_logs WHERE id = ?", (log_id,)
    ).fetchone()
    if not log:
        return jsonify({"error": "log not found"}), 404

    # Participants can only delete their own logs
    if log["participant_id"] != participant_id:
        return jsonify({"error": "forbidden"}), 403

    # Only allow deleting the most recent drink
    most_recent = db.execute(
        """SELECT id FROM drink_logs
           WHERE participant_id = ? ORDER BY logged_at DESC LIMIT 1""",
        (participant_id,),
    ).fetchone()
    if not most_recent or most_recent["id"] != log_id:
        return jsonify({"error": "can only remove most recent drink"}), 409

    db.execute("DELETE FROM drink_logs WHERE id = ?", (log_id,))
    db.commit()
    return jsonify({"status": "deleted"})


@drink_logs_bp.get("/sessions/<session_id>/logs")
def get_logs(session_id: str):
    db = get_db()
    rows = db.execute(
        """SELECT dl.id, dl.participant_id, dl.drink_id, dl.logged_at,
                  d.name AS drink_name, d.volume_ml, d.alcohol_percent, d.color, d.icon
           FROM drink_logs dl
           JOIN drinks d ON d.id = dl.drink_id
           WHERE dl.session_id = ?
           ORDER BY dl.logged_at DESC""",
        (session_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])
