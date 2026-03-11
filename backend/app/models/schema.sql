-- Users (optional accounts)
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,          -- UUID
    username    TEXT UNIQUE NOT NULL,
    date_of_birth TEXT NOT NULL,           -- used as password
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,      -- UUID (also QR code token)
    host_id         TEXT,                  -- nullable (anonymous hosts allowed)
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active', -- active | ended
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (host_id) REFERENCES users(id)
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
    id              TEXT PRIMARY KEY,      -- UUID stored in localStorage
    session_id      TEXT NOT NULL,
    user_id         TEXT,                  -- nullable (anonymous)
    display_name    TEXT NOT NULL,
    weight_kg       REAL,
    gender          TEXT,                  -- 'male' | 'female' | 'other'
    avatar_blob     BLOB,
    joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Drink definitions (per session)
CREATE TABLE IF NOT EXISTS drinks (
    id              TEXT PRIMARY KEY,      -- UUID
    session_id      TEXT NOT NULL,
    name            TEXT NOT NULL,
    volume_ml       REAL NOT NULL,
    alcohol_percent REAL NOT NULL,
    color           TEXT NOT NULL DEFAULT '#f59e0b',
    icon            TEXT NOT NULL DEFAULT '🍺',
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Drink logs
CREATE TABLE IF NOT EXISTS drink_logs (
    id              TEXT PRIMARY KEY,      -- UUID
    session_id      TEXT NOT NULL,
    participant_id  TEXT NOT NULL,
    drink_id        TEXT NOT NULL,
    logged_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (participant_id) REFERENCES participants(id),
    FOREIGN KEY (drink_id) REFERENCES drinks(id)
);

-- Crash events (auto-generated per session)
CREATE TABLE IF NOT EXISTS crash_events (
    id              TEXT PRIMARY KEY,      -- UUID
    session_id      TEXT NOT NULL,
    starts_at       TEXT NOT NULL,
    ends_at         TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
