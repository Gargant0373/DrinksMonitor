"""
Session routes.

POST /sessions              – create a session
GET  /sessions/<id>         – get session details + QR data
POST /sessions/<id>/end     – end a session manually
GET  /sessions/<id>/qr      – return QR code PNG
GET  /sessions/<id>/drinks  – list drink definitions
POST /sessions/<id>/drinks  – add a drink definition
POST /sessions/<id>/drinks/presets – load preset drinks
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, Response

from app.models.database import get_db
from app.services.crash import generate_crash_events
from app.services.qr import generate_qr_png
from app.services.presets import PRESETS

sessions_bp = Blueprint("sessions", __name__)

MAX_PARTICIPANTS = 25


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@sessions_bp.post("/sessions")
def create_session():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    session_id = str(uuid.uuid4())
    now = _now_iso()

    db = get_db()
    db.execute(
        "INSERT INTO sessions (id, name, host_id, created_at, last_activity_at) VALUES (?,?,?,?,?)",
        (session_id, name, data.get("host_id"), now, now),
    )

    # Pre-generate crash events for 4 hours
    crash_events = generate_crash_events(now, session_duration_hours=4)
    for evt in crash_events:
        db.execute(
            "INSERT INTO crash_events (id, session_id, starts_at, ends_at) VALUES (?,?,?,?)",
            (evt["id"], session_id, evt["starts_at"], evt["ends_at"]),
        )

    db.commit()
    return jsonify({"session_id": session_id}), 201


@sessions_bp.get("/sessions")
def list_sessions():
    db = get_db()
    rows = db.execute(
        "SELECT id, name, status, created_at FROM sessions ORDER BY created_at DESC LIMIT 20"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@sessions_bp.get("/sessions/<session_id>")
def get_session(session_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return jsonify({"error": "session not found"}), 404
    return jsonify(dict(row))


@sessions_bp.post("/sessions/<session_id>/end")
def end_session(session_id: str):
    db = get_db()
    row = db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return jsonify({"error": "session not found"}), 404

    db.execute(
        "UPDATE sessions SET status = 'ended', last_activity_at = ? WHERE id = ?",
        (_now_iso(), session_id),
    )
    db.commit()
    return jsonify({"status": "ended"})


@sessions_bp.get("/sessions/<session_id>/qr")
def get_qr(session_id: str):
    db = get_db()
    row = db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return jsonify({"error": "session not found"}), 404

    # The QR encodes the join URL; frontend base URL comes from config or header
    base_url = request.args.get("base_url", request.host_url.rstrip("/"))
    join_url = f"{base_url}/join/{session_id}"
    png_bytes = generate_qr_png(join_url)
    return Response(png_bytes, mimetype="image/png")


# ---------------------------------------------------------------------------
# Drink definitions
# ---------------------------------------------------------------------------

@sessions_bp.get("/sessions/<session_id>/drinks")
def list_drinks(session_id: str):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM drinks WHERE session_id = ?", (session_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@sessions_bp.post("/sessions/<session_id>/drinks")
def add_drink(session_id: str):
    data = request.get_json(force=True)
    required = ("name", "volume_ml", "alcohol_percent")
    for field in required:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    drink_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        """INSERT INTO drinks (id, session_id, name, volume_ml, alcohol_percent, color, icon)
           VALUES (?,?,?,?,?,?,?)""",
        (
            drink_id,
            session_id,
            data["name"],
            float(data["volume_ml"]),
            float(data["alcohol_percent"]),
            data.get("color", "#f59e0b"),
            data.get("icon", "🍺"),
        ),
    )
    db.execute(
        "UPDATE sessions SET last_activity_at = ? WHERE id = ?",
        (_now_iso(), session_id),
    )
    db.commit()
    return jsonify({"drink_id": drink_id}), 201


@sessions_bp.post("/sessions/<session_id>/drinks/presets")
def load_presets(session_id: str):
    db = get_db()
    row = db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return jsonify({"error": "session not found"}), 404

    ids = []
    for preset in PRESETS:
        drink_id = str(uuid.uuid4())
        db.execute(
            """INSERT INTO drinks (id, session_id, name, volume_ml, alcohol_percent, color, icon)
               VALUES (?,?,?,?,?,?,?)""",
            (
                drink_id,
                session_id,
                preset["name"],
                preset["volume_ml"],
                preset["alcohol_percent"],
                preset["color"],
                preset["icon"],
            ),
        )
        ids.append(drink_id)

    db.execute(
        "UPDATE sessions SET last_activity_at = ? WHERE id = ?",
        (_now_iso(), session_id),
    )
    db.commit()
    return jsonify({"drink_ids": ids}), 201
