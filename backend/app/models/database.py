"""
Database connection helpers.
Each request gets its own connection via Flask's `g` object.
"""

import sqlite3
import os
from flask import g, current_app


DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "drinks_game.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        db_path = current_app.config.get("DATABASE") or DB_PATH
        g.db = sqlite3.connect(
            db_path,
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(app) -> None:
    """Create tables if they don't exist."""
    with app.app_context():
        db_path = app.config.get("DATABASE") or DB_PATH
        conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        try:
            with open(SCHEMA_PATH, "r") as f:
                conn.executescript(f.read())
            conn.commit()
        finally:
            conn.close()
