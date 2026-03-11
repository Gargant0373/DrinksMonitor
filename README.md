# Drink Session Tracker

A gamified web application for tracking drinks during social events. Participants join a session via QR code, log drinks from their phones, and compete on a leaderboard while statistics are displayed on a shared monitor (TV/projector).

The system tracks drink counts, estimates BAC, shows drink distribution statistics, and includes periodic “crash” events that temporarily boost scoring.

---

# Tech Stack

Frontend
- React
- Vite
- Mobile-first UI
- Polling for session updates

Backend
- Python
- Flask
- SQLite

Other
- QR code session joining
- LocalStorage participant identity
- Camera-based profile image capture

---

# Core Concept

A **session** represents a party or drinking event.

Flow:

1. Host creates a session
2. Host defines drinks (or loads presets)
3. QR code is generated
4. Participants scan the QR code and join
5. Participants log drinks from their phones
6. A monitor dashboard shows live statistics

Sessions automatically close after **4 hours of inactivity**, but the host can also end them manually.

Maximum participants per session: **25**

---

# Key Features

## Drink Tracking

Participants log drinks with a single button press.

Rules:
- One button press = one drink
- Drink timestamps are stored
- Logging is rate-limited (1 drink / 5 seconds)
- Participants can remove their **most recent drink**
- Participants cannot edit or delete arbitrary drink logs
- Participants can only log drinks for themselves

---

## Drink Definitions

Drinks are defined per session by the host.

Drink attributes:

- name
- volume_ml
- alcohol_percent
- color
- icon

Hosts can load preset drinks such as:

- Beer
- Wine
- Shot
- Cocktail

Participants cannot create custom drinks.

---

# Gamification

## Points

Baseline:

```

1 drink = 1 point

```

However, a **fatigue penalty** reduces points as a user drinks more.

Example concept:

```

points = base_points / (1 + drinks_logged * fatigue_factor)

```

This discourages brute-force drinking.

---

## Crash Event

Every hour a **random crash event** occurs.

Crash properties:

- Frequency: once per hour
- Trigger: random time during the hour
- Duration: 2 minutes

During the crash:

```

All drinks logged earn double points

```

Crash state must be visible on the monitor.

---

# BAC Estimation

BAC is estimated using a simplified Widmark formula.

Inputs:

- alcohol grams consumed
- body weight
- gender
- time elapsed

Example formula:

```

BAC = (alcohol_g / (weight_kg * r)) - (0.015 * hours_elapsed)

```

Where:

```

r = 0.68 for male
r = 0.55 for female

```

The monitor highlights the **currently drunkest participant**.

---

# Monitor Dashboard

A dedicated monitor screen is designed to be projected on a TV.

It rotates through statistics automatically.

## Screens

### Leaderboard

Displays:

- rank
- profile image
- display name
- points
- drink count

### Drink Distribution

Shows percentage breakdown of drinks consumed by type.

### Alcohol Consumption

Displays alcohol totals per participant.

### Drunkest Player

Shows participants ranked by BAC.

---

## Screen Rotation

Screens rotate automatically every ~20–30 seconds.

The bottom of the screen shows a **progress bar** indicating time until the next screen.

Transitions should be smooth (fade or slide).

---

# Participants

Participants join via QR code.

Identification is handled using:

```

participant_id stored in localStorage

```

Participants can:

- choose a display name per session
- upload a profile image
- enter weight and gender for BAC calculation

Profile images can be captured using the device camera.

Images are stored in the database as:

```

SQLite BLOB

```

---

# Authentication

Authentication is optional.

Anonymous users:
- Join using nickname
- Identified via localStorage

Accounts (optional):
- username
- date_of_birth (used as password)

Accounts allow long-term statistics tracking.

Sessions themselves **do not require authentication**.

---

# Database (SQLite)

Core tables:

```

users
sessions
participants
drinks
drink_logs

```

Images are stored as BLOBs.

Sessions track activity timestamps to detect inactivity.

---

# API Overview

Example endpoints:

## Sessions

```

POST /sessions
GET /sessions/{id}
POST /sessions/{id}/end

```

## Participants

```

POST /sessions/{id}/join
GET /sessions/{id}/participants

```

## Drinks

```

GET /sessions/{id}/drinks
POST /sessions/{id}/drinks

```

## Drink Logs

```

POST /drink
DELETE /drink/{id}
GET /sessions/{id}/logs

```

## Monitor Stats

```

GET /sessions/{id}/stats

```

Frontend polls these endpoints periodically.

---

# Frontend Structure

Suggested React structure:

```

src/
pages/
Home
CreateSession
JoinSession
ParticipantDashboard
MonitorScreen

components/
DrinkButton
Leaderboard
CrashBanner
DrinkChart
BACDisplay
Avatar

```

State management options:

- React Query
- SWR
- Context API

Polling interval:

```

2–5 seconds

```

---

# Session Lifecycle

```

Host creates session
↓
Drinks configured
↓
QR code generated
↓
Participants join
↓
Drink logging begins
↓
Crash events occur hourly
↓
Monitor rotates statistics
↓
Session ends (manual or inactivity)

```

---

# Design Requirements

UI must be:

- mobile-first
- fast for drink logging
- readable from a TV screen
- minimal friction for joining

Monitor screens should prioritize:

- large typography
- clear ranking
- visual charts

---

# Constraints

- Max 25 participants per session
- Polling instead of websockets
- SQLite database
- Images stored as BLOB
- Participants cannot modify other users' drinks
