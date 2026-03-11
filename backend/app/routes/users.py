"""
User (account) routes — optional authentication.

POST /users          – create an account
POST /users/login    – login with username + date_of_birth
GET  /users/<id>     – get account profile
"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from app.models.database import get_db

users_bp = Blueprint("users", __name__)


@users_bp.post("/users")
def create_user():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    dob = (data.get("date_of_birth") or "").strip()

    if not username or not dob:
        return jsonify({"error": "username and date_of_birth are required"}), 400

    db = get_db()
    existing = db.execute(
        "SELECT id FROM users WHERE username = ?", (username,)
    ).fetchone()
    if existing:
        return jsonify({"error": "username already taken"}), 409

    user_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO users (id, username, date_of_birth) VALUES (?,?,?)",
        (user_id, username, dob),
    )
    db.commit()
    return jsonify({"user_id": user_id}), 201


@users_bp.post("/users/login")
def login():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    dob = (data.get("date_of_birth") or "").strip()

    db = get_db()
    user = db.execute(
        "SELECT id, username FROM users WHERE username = ? AND date_of_birth = ?",
        (username, dob),
    ).fetchone()
    if not user:
        return jsonify({"error": "invalid credentials"}), 401

    return jsonify({"user_id": user["id"], "username": user["username"]})


@users_bp.get("/users/<user_id>")
def get_user(user_id: str):
    db = get_db()
    user = db.execute(
        "SELECT id, username, created_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify(dict(user))
