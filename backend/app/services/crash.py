"""
Crash event scheduler.

One crash event per hour, triggered at a random time within the hour.
Duration: 2 minutes.
"""

import random
import uuid
from datetime import datetime, timezone, timedelta


CRASH_DURATION_SECONDS = 120  # 2 minutes
CRASH_INTERVAL_SECONDS = 3600  # 1 hour


def generate_crash_events(session_start_iso: str, session_duration_hours: int = 4) -> list[dict]:
    """
    Pre-generate crash events for the expected session duration.
    Each hour gets one crash at a random offset within that hour.
    """
    start = datetime.fromisoformat(session_start_iso.replace("Z", "+00:00"))
    events = []

    for hour in range(session_duration_hours):
        hour_start = start + timedelta(hours=hour)
        # Random offset: between 1 minute and 58 minutes into the hour
        offset_seconds = random.randint(60, CRASH_INTERVAL_SECONDS - CRASH_DURATION_SECONDS - 60)
        crash_start = hour_start + timedelta(seconds=offset_seconds)
        crash_end = crash_start + timedelta(seconds=CRASH_DURATION_SECONDS)

        events.append({
            "id": str(uuid.uuid4()),
            "starts_at": crash_start.isoformat(),
            "ends_at": crash_end.isoformat(),
        })

    return events
