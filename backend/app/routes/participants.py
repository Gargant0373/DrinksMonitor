"""
Participant routes.

POST /sessions/<id>/join              – join a session
GET  /sessions/<id>/participants      – list participants
GET  /participants/<id>/avatar        – serve avatar image
PUT  /participants/<id>/avatar        – upload avatar image
PATCH /participants/<id>              – update display_name and/or avatar
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, Response

from app.models.database import get_db

participants_bp = Blueprint("participants", __name__)

MAX_PARTICIPANTS = 25


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@participants_bp.post("/sessions/<session_id>/join")
def join_session(session_id: str):
    db = get_db()

    session = db.execute(
        "SELECT * FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    if not session:
        return jsonify({"error": "session not found"}), 404
    if session["status"] != "active":
        return jsonify({"error": "session is not active"}), 409

    count = db.execute(
        "SELECT COUNT(*) FROM participants WHERE session_id = ?", (session_id,)
    ).fetchone()[0]
    if count >= MAX_PARTICIPANTS:
        return jsonify({"error": "session is full"}), 409

    data = request.get_json(force=True)
    display_name = (data.get("display_name") or "").strip()
    if not display_name:
        return jsonify({"error": "display_name is required"}), 400

    # Idempotent: if the participant_id already exists for this session, return it
    existing_id = data.get("participant_id")
    if existing_id:
        row = db.execute(
            "SELECT * FROM participants WHERE id = ? AND session_id = ?",
            (existing_id, session_id),
        ).fetchone()
        if row:
            return jsonify({"participant_id": row["id"], "rejoined": True})

    participant_id = str(uuid.uuid4())
    now = _now_iso()

    db.execute(
        """INSERT INTO participants (id, session_id, user_id, display_name, weight_kg, gender, joined_at)
           VALUES (?,?,?,?,?,?,?)""",
        (
            participant_id,
            session_id,
            data.get("user_id"),
            display_name,
            data.get("weight_kg"),
            data.get("gender"),
            now,
        ),
    )
    db.execute(
        "UPDATE sessions SET last_activity_at = ? WHERE id = ?",
        (now, session_id),
    )
    db.commit()
    return jsonify({"participant_id": participant_id}), 201


@participants_bp.get("/sessions/<session_id>/participants")
def list_participants(session_id: str):
    db = get_db()
    rows = db.execute(
        """SELECT id, session_id, user_id, display_name, weight_kg, gender, joined_at
           FROM participants WHERE session_id = ?""",
        (session_id,),
    ).fetchall()
    # Avatars are excluded from list to keep payload small
    return jsonify([dict(r) for r in rows])


@participants_bp.get("/participants/<participant_id>/avatar")
def get_avatar(participant_id: str):
    db = get_db()
    row = db.execute(
        "SELECT avatar_blob FROM participants WHERE id = ?", (participant_id,)
    ).fetchone()
    if not row or not row["avatar_blob"]:
        return jsonify({"error": "no avatar"}), 404
    return Response(row["avatar_blob"], mimetype="image/jpeg")


@participants_bp.put("/participants/<participant_id>/avatar")
def upload_avatar(participant_id: str):
    """Accepts raw JPEG bytes or multipart FormData with a 'file' field."""
    if request.files:
        f = next(iter(request.files.values()))
        image_data = f.read()
    elif request.data:
        image_data = request.data
    else:
        return jsonify({"error": "no image data"}), 400

    db = get_db()
    result = db.execute(
        "UPDATE participants SET avatar_blob = ? WHERE id = ?",
        (image_data, participant_id),
    )
    if result.rowcount == 0:
        return jsonify({"error": "participant not found"}), 404
    db.commit()
    return jsonify({"status": "ok"})


@participants_bp.patch("/participants/<participant_id>")
def update_participant(participant_id: str):
    """Update display_name.  Avatar is updated separately via PUT /avatar."""
    data = request.get_json(force=True)
    display_name = (data.get("display_name") or "").strip()
    if not display_name:
        return jsonify({"error": "display_name is required"}), 400

    db = get_db()
    result = db.execute(
        "UPDATE participants SET display_name = ? WHERE id = ?",
        (display_name, participant_id),
    )
    if result.rowcount == 0:
        return jsonify({"error": "participant not found"}), 404
    db.commit()
    return jsonify({"status": "ok", "display_name": display_name})
