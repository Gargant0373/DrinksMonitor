"""
Photo routes.

POST /sessions/<id>/photos              – upload a snap (multipart or raw bytes)
GET  /sessions/<id>/photos              – list photo metadata for the session
GET  /photos/<id>                       – serve photo image bytes
PATCH /photos/<id>                      – update caption
POST /photos/vote                       – cast a vote (called when logging a drink)
GET  /sessions/<id>/vote-pair           – get two random photos to vote on
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, Response

from app.models.database import get_db
from app.services.scoring import compute_photo_points

photos_bp = Blueprint("photos", __name__)

MAX_PHOTO_BYTES = 10 * 1024 * 1024  # 10 MB


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Upload a photo ────────────────────────────────────────────────────────────

@photos_bp.post("/sessions/<session_id>/photos")
def upload_photo(session_id: str):
    db = get_db()

    session = db.execute(
        "SELECT status FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    if not session:
        return jsonify({"error": "session not found"}), 404

    participant_id = request.args.get("participant_id") or (
        request.get_json(silent=True) or {}
    ).get("participant_id")

    if not participant_id:
        return jsonify({"error": "participant_id is required"}), 400

    participant = db.execute(
        "SELECT id FROM participants WHERE id = ? AND session_id = ?",
        (participant_id, session_id),
    ).fetchone()
    if not participant:
        return jsonify({"error": "participant not found in session"}), 404

    caption = request.args.get("caption", "")

    # Accept either multipart file or raw body
    if request.files:
        f = next(iter(request.files.values()))
        image_data = f.read(MAX_PHOTO_BYTES)
        mime_type  = f.mimetype or "image/jpeg"
    elif request.data:
        image_data = request.data[:MAX_PHOTO_BYTES]
        mime_type  = request.content_type or "image/jpeg"
    else:
        return jsonify({"error": "no image data"}), 400

    # Count existing photos for fatigue calc
    photo_count = db.execute(
        "SELECT COUNT(*) FROM photos WHERE participant_id = ? AND session_id = ?",
        (participant_id, session_id),
    ).fetchone()[0]

    points = compute_photo_points(photo_count)

    photo_id = str(uuid.uuid4())
    now      = _now_iso()

    db.execute(
        """INSERT INTO photos (id, session_id, participant_id, caption, image_blob, mime_type, taken_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (photo_id, session_id, participant_id, caption, image_data, mime_type, now),
    )
    db.commit()

    return jsonify({
        "photo_id":     photo_id,
        "points_earned": points,
        "taken_at":     now,
    }), 201


# ── List photos (metadata only, no blobs) ────────────────────────────────────

@photos_bp.get("/sessions/<session_id>/photos")
def list_photos(session_id: str):
    db = get_db()
    rows = db.execute(
        """SELECT p.id, p.participant_id, p.caption, p.taken_at,
                  pt.display_name,
                  (SELECT COUNT(*) FROM photo_votes v WHERE v.photo_id = p.id) AS vote_count
           FROM photos p
           JOIN participants pt ON pt.id = p.participant_id
           WHERE p.session_id = ?
           ORDER BY p.taken_at DESC""",
        (session_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# ── Serve image bytes ─────────────────────────────────────────────────────────

@photos_bp.get("/photos/<photo_id>")
def get_photo(photo_id: str):
    db = get_db()
    row = db.execute(
        "SELECT image_blob, mime_type FROM photos WHERE id = ?", (photo_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "photo not found"}), 404
    return Response(row["image_blob"], mimetype=row["mime_type"])


# ── Update caption ────────────────────────────────────────────────────────────

@photos_bp.patch("/photos/<photo_id>")
def update_caption(photo_id: str):
    data    = request.get_json(force=True)
    caption = data.get("caption", "")

    db = get_db()
    result = db.execute(
        "UPDATE photos SET caption = ? WHERE id = ?", (caption, photo_id)
    )
    if result.rowcount == 0:
        return jsonify({"error": "photo not found"}), 404
    db.commit()
    return jsonify({"status": "ok"})


# ── Vote pair ─────────────────────────────────────────────────────────────────

@photos_bp.get("/sessions/<session_id>/vote-pair")
def get_vote_pair(session_id: str):
    """
    Return two random photos from other participants for the voter to choose from.
    Excludes photos the voter already voted on this drink_log.
    """
    voter_id     = request.args.get("voter_id")
    drink_log_id = request.args.get("drink_log_id")

    if not voter_id:
        return jsonify({"error": "voter_id is required"}), 400

    db = get_db()

    # Fetch photos not taken by this voter
    rows = db.execute(
        """SELECT p.id, p.caption, p.taken_at, pt.display_name
           FROM photos p
           JOIN participants pt ON pt.id = p.participant_id
           WHERE p.session_id = ?
             AND p.participant_id != ?
           ORDER BY RANDOM()
           LIMIT 2""",
        (session_id, voter_id),
    ).fetchall()

    if len(rows) < 2:
        return jsonify({"pair": None, "reason": "not enough photos yet"})

    return jsonify({
        "pair": [dict(r) for r in rows],
        "photo_url": lambda pid: f"/photos/{pid}",
    })


# ── Cast a vote ───────────────────────────────────────────────────────────────

@photos_bp.post("/photos/vote")
def cast_vote():
    """
    Body: { voter_id, photo_id, drink_log_id, session_id }
    One vote per (voter, drink_log).
    """
    data         = request.get_json(force=True)
    voter_id     = data.get("voter_id")
    photo_id     = data.get("photo_id")
    drink_log_id = data.get("drink_log_id")
    session_id   = data.get("session_id")

    if not all([voter_id, photo_id, drink_log_id, session_id]):
        return jsonify({"error": "voter_id, photo_id, drink_log_id and session_id are required"}), 400

    db = get_db()

    # Verify photo belongs to session
    photo = db.execute(
        "SELECT id FROM photos WHERE id = ? AND session_id = ?",
        (photo_id, session_id),
    ).fetchone()
    if not photo:
        return jsonify({"error": "photo not found"}), 404

    # Idempotent: already voted on this drink?
    existing = db.execute(
        "SELECT id FROM photo_votes WHERE voter_id = ? AND drink_log_id = ?",
        (voter_id, drink_log_id),
    ).fetchone()
    if existing:
        return jsonify({"error": "already voted for this drink log"}), 409

    db.execute(
        """INSERT INTO photo_votes (id, session_id, voter_id, photo_id, drink_log_id, voted_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (str(uuid.uuid4()), session_id, voter_id, photo_id, drink_log_id, _now_iso()),
    )
    db.commit()
    return jsonify({"status": "ok"}), 201
