"""
BAC estimation using the simplified Widmark formula.

BAC = (alcohol_g / (weight_kg * r)) - (0.015 * hours_elapsed)

r = 0.68 for male
r = 0.55 for female / other
"""

from datetime import datetime, timezone


WIDMARK_R = {"male": 0.68, "female": 0.55, "other": 0.55}
METABOLISM_RATE = 0.015  # BAC units per hour


def alcohol_grams(volume_ml: float, alcohol_percent: float) -> float:
    """Convert drink volume + ABV to grams of pure alcohol."""
    # density of ethanol ≈ 0.789 g/mL
    return volume_ml * (alcohol_percent / 100) * 0.789


def estimate_bac(
    total_alcohol_g: float,
    weight_kg: float,
    gender: str,
    session_start_iso: str,
) -> float:
    """
    Return estimated BAC (g/dL) clamped to >= 0.
    session_start_iso is the ISO-8601 timestamp when the participant joined.
    """
    if weight_kg is None or weight_kg <= 0:
        return 0.0

    r = WIDMARK_R.get((gender or "other").lower(), 0.55)

    start = datetime.fromisoformat(session_start_iso.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    hours_elapsed = max((now - start).total_seconds() / 3600, 0)

    bac = (total_alcohol_g / (weight_kg * r)) - (METABOLISM_RATE * hours_elapsed)
    return max(round(bac, 4), 0.0)
