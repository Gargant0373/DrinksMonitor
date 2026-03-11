"""
Stats route.

GET /sessions/<id>/stats

Returns:
  - leaderboard         sorted by points
  - drink_distribution  breakdown by drink type
  - bac_ranking         sorted by estimated BAC
  - recent_logs         last 20 events across all participants (for activity feed)
  - drinks_over_time    per-5-min bucket counts since session start (for chart)
  - crash_active        bool
  - current_crash       crash event dict or null
  - session             session metadata
"""

from collections import defaultdict
from datetime import datetime, timezone, timedelta

from flask import Blueprint, jsonify

from app.models.database import get_db
from app.services.bac import alcohol_grams, estimate_bac
from app.services.scoring import total_points_from_logs, is_crash_active

stats_bp = Blueprint("stats", __name__)

BUCKET_MINUTES = 5  # granularity of the drinks-over-time chart


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_ts(s: str) -> datetime:
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@stats_bp.get("/sessions/<session_id>/stats")
def get_stats(session_id: str):
    db = get_db()

    session = db.execute(
        "SELECT * FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    if not session:
        return jsonify({"error": "session not found"}), 404

    participants = db.execute(
        "SELECT id, display_name, weight_kg, gender, joined_at FROM participants WHERE session_id = ?",
        (session_id,),
    ).fetchall()

    # Fetch all logs ordered oldest-first for correct point calculation
    logs = db.execute(
        """SELECT dl.id, dl.participant_id, dl.drink_id, dl.logged_at,
                  d.name AS drink_name, d.volume_ml, d.alcohol_percent, d.color, d.icon
           FROM drink_logs dl
           JOIN drinks d ON d.id = dl.drink_id
           WHERE dl.session_id = ?
           ORDER BY dl.logged_at ASC""",
        (session_id,),
    ).fetchall()

    crash_events = db.execute(
        "SELECT id, starts_at, ends_at FROM crash_events WHERE session_id = ?",
        (session_id,),
    ).fetchall()
    crash_list = [dict(e) for e in crash_events]
    crash_active = is_crash_active(crash_list)
    current_crash = next(
        (e for e in crash_list if e["starts_at"] <= _now_iso() <= e["ends_at"]),
        None,
    )

    # ── Group logs per participant, annotate with crash flag ─────────────────
    logs_by_participant: dict[str, list] = defaultdict(list)
    drink_type_counts: dict[str, int] = defaultdict(int)
    participant_names: dict[str, str] = {p["id"]: p["display_name"] for p in participants}

    for log in logs:
        log_d = dict(log)
        log_d["during_crash"] = any(
            e["starts_at"] <= log_d["logged_at"] <= e["ends_at"] for e in crash_list
        )
        logs_by_participant[log_d["participant_id"]].append(log_d)
        drink_type_counts[log_d["drink_name"]] += 1

    # ── Leaderboard + BAC ─────────────────────────────────────────────────────
    leaderboard = []
    bac_ranking  = []

    for p in participants:
        pid    = p["id"]
        p_logs = logs_by_participant[pid]  # already oldest-first
        points = total_points_from_logs(p_logs)

        total_alcohol_g = sum(
            alcohol_grams(log["volume_ml"], log["alcohol_percent"]) for log in p_logs
        )
        bac = estimate_bac(
            total_alcohol_g,
            p["weight_kg"] or 0,
            p["gender"] or "other",
            p["joined_at"],
        )

        entry = {
            "participant_id": pid,
            "display_name":   p["display_name"],
            "drink_count":    len(p_logs),
            "points":         points,
            "bac":            bac,
        }
        leaderboard.append(entry)
        bac_ranking.append(entry)

    leaderboard.sort(key=lambda x: x["points"], reverse=True)
    bac_ranking.sort(key=lambda x: x["bac"],    reverse=True)

    # ── Drink distribution ────────────────────────────────────────────────────
    total_drinks = sum(drink_type_counts.values()) or 1
    drink_distribution = [
        {"name": name, "count": count, "percent": round(count / total_drinks * 100, 1)}
        for name, count in sorted(drink_type_counts.items(), key=lambda x: -x[1])
    ]

    # ── Recent activity feed (newest first, max 20) ───────────────────────────
    all_logs_desc = sorted(logs, key=lambda r: r["logged_at"], reverse=True)[:20]
    recent_logs = [
        {
            "participant_id":   r["participant_id"],
            "display_name":     participant_names.get(r["participant_id"], "?"),
            "drink_name":       r["drink_name"],
            "icon":             r["icon"],
            "color":            r["color"],
            "logged_at":        r["logged_at"],
        }
        for r in all_logs_desc
    ]

    # ── Drinks over time (5-min buckets, anchored to session start) ────────────
    now           = datetime.now(timezone.utc)
    session_start = _parse_ts(dict(session)["created_at"])

    # Build bucket map relative to session start
    buckets: dict[int, int] = {}
    for log in logs:
        ts     = _parse_ts(log["logged_at"])
        offset = (ts - session_start).total_seconds() / 60
        idx    = max(0, int(offset // BUCKET_MINUTES))
        buckets[idx] = buckets.get(idx, 0) + 1

    # Always show at least 60 minutes; extend to "now" if session is longer
    elapsed_min = (now - session_start).total_seconds() / 60
    window_min  = max(60.0, elapsed_min)
    max_bucket  = int(window_min // BUCKET_MINUTES)

    # Cap display at 30 buckets (2.5 h); slide window to show most recent
    MAX_BUCKETS = 30
    start_idx   = max(0, max_bucket - MAX_BUCKETS + 1)

    drinks_over_time = [
        {
            "label": f"+{i * BUCKET_MINUTES}m",
            "count": buckets.get(i, 0),
        }
        for i in range(start_idx, max_bucket + 1)
    ]

    return jsonify({
        "session":           dict(session),
        "leaderboard":       leaderboard,
        "drink_distribution": drink_distribution,
        "bac_ranking":       bac_ranking,
        "recent_logs":       recent_logs,
        "drinks_over_time":  drinks_over_time,
        "crash_active":      crash_active,
        "current_crash":     current_crash,
    })

