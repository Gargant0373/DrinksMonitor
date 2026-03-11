"""
Scoring service.

Per-drink points formula:

  pace_factor = clamp(gap_minutes / IDEAL_GAP_MINUTES, 0.25, 2.0)
  fatigue_factor = 1 / (1 + drinks_logged * FATIGUE_K)
  points = BASE * pace_factor * fatigue_factor * (2 if crash else 1)

Pace factor behaviour:
  - gap >= 30 min  → pace_factor = 1.0  (ideal, full points)
  - gap >= 60 min  → pace_factor = 2.0  (bonus for patience, capped)
  - gap = 15 min   → pace_factor = 0.5  (half points for drinking fast)
  - gap = 5 min    → pace_factor = 0.25 (floor — rate-limit catches anything faster)

First drink of the session always uses pace_factor = 1.0 (no previous gap).
"""

from datetime import datetime, timezone

BASE          = 1.0
IDEAL_GAP_MIN = 30.0   # minutes — "perfect" drinking pace
PACE_MIN      = 0.25   # floor multiplier  (drinking too fast)
PACE_MAX      = 2.0    # ceiling multiplier (drinking slow / patiently)
FATIGUE_K     = 0.05   # fatigue constant


def _pace_factor(gap_seconds: float | None) -> float:
    """Return the pace multiplier for a drink logged `gap_seconds` after the previous one."""
    if gap_seconds is None:
        return 1.0  # first drink of the session
    gap_min = gap_seconds / 60.0
    raw = gap_min / IDEAL_GAP_MIN          # 1.0 at ideal, <1 fast, >1 slow
    return round(min(max(raw, PACE_MIN), PACE_MAX), 4)


def compute_points(
    drinks_logged: int,
    gap_seconds: float | None = None,
    during_crash: bool = False,
) -> float:
    """
    Return the point value for a single drink.

    drinks_logged  – how many the participant already has (before this drink)
    gap_seconds    – seconds since their previous drink (None = first drink)
    during_crash   – whether a crash event is active
    """
    pace    = _pace_factor(gap_seconds)
    fatigue = 1.0 / (1.0 + drinks_logged * FATIGUE_K)
    points  = BASE * pace * fatigue
    if during_crash:
        points *= 2
    return round(points, 4)


def total_points_from_logs(logs: list[dict]) -> float:
    """
    Recompute cumulative points from an ordered list of log dicts.
    Each dict must have: logged_at (ISO str), during_crash (bool).
    Logs must be sorted oldest-first.
    """
    points = 0.0
    for i, log in enumerate(logs):
        if i == 0:
            gap = None
        else:
            prev = datetime.fromisoformat(logs[i - 1]["logged_at"].replace("Z", "+00:00"))
            curr = datetime.fromisoformat(log["logged_at"].replace("Z", "+00:00"))
            if prev.tzinfo is None:
                prev = prev.replace(tzinfo=timezone.utc)
            if curr.tzinfo is None:
                curr = curr.replace(tzinfo=timezone.utc)
            gap = (curr - prev).total_seconds()
        points += compute_points(i, gap_seconds=gap, during_crash=log.get("during_crash", False))
    return round(points, 2)


def is_crash_active(crash_events: list[dict]) -> bool:
    """Return True if any crash event is currently active."""
    now = datetime.now(timezone.utc).isoformat()
    for event in crash_events:
        if event["starts_at"] <= now <= event["ends_at"]:
            return True
    return False


# ── Photo scoring ─────────────────────────────────────────────────────────────
PHOTO_BASE      = 0.5   # base points per photo taken
PHOTO_FATIGUE_K = 0.10  # stronger fatigue for photos than drinks
VOTE_POINTS     = 0.25  # points awarded per vote received


def compute_photo_points(photos_taken: int) -> float:
    """
    Points for uploading a snap.
    Same fatigue mechanic as drinks — diminishing returns.
    photos_taken = how many photos this participant already uploaded (before this one).
    """
    fatigue = 1.0 / (1.0 + photos_taken * PHOTO_FATIGUE_K)
    return round(PHOTO_BASE * fatigue, 4)


def total_photo_points(photo_count: int, vote_count: int) -> float:
    """
    Total points from photo activity:
      - sum of per-photo points (with fatigue)
      - plus VOTE_POINTS per vote received
    """
    snap_pts = sum(
        compute_photo_points(i) for i in range(photo_count)
    )
    return round(snap_pts + vote_count * VOTE_POINTS, 2)
