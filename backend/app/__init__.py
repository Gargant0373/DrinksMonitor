"""
Flask application factory.
"""

from flask import Flask
from flask_cors import CORS

from app.models.database import close_db, init_db
from app.routes.sessions import sessions_bp
from app.routes.participants import participants_bp
from app.routes.drink_logs import drink_logs_bp
from app.routes.stats import stats_bp
from app.routes.users import users_bp
from app.routes.photos import photos_bp


def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=None,  # defaults to drinks_game.db next to run.py
        SECRET_KEY="change-me-in-production",
    )
    if config:
        app.config.update(config)

    CORS(app)

    app.teardown_appcontext(close_db)

    app.register_blueprint(sessions_bp)
    app.register_blueprint(participants_bp)
    app.register_blueprint(drink_logs_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(photos_bp)

    init_db(app)

    return app
