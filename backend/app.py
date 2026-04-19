from dotenv import load_dotenv
load_dotenv()  # must run before any other imports that read env vars

import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from models import db
from auth import auth_bp
from fish_routes import fish_bp, load_model

limiter = Limiter(key_func=get_remote_address, default_limits=[])


def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', '').replace('postgres://', 'postgresql://')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'change-this-secret')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload

    db.init_app(app)
    JWTManager(app)

    # Restrict CORS in production by setting ALLOWED_ORIGINS env var
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
    if allowed_origins != '*':
        origins = [o.strip() for o in allowed_origins.split(',')]
        CORS(app, origins=origins)
    else:
        CORS(app)

    limiter.init_app(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(fish_bp, url_prefix='/api/fish')

    # Rate-limit sensitive auth endpoints (applied after blueprint registration)
    with app.app_context():
        limiter.limit('20 per minute')(app.view_functions['auth.register'])
        limiter.limit('20 per minute')(app.view_functions['auth.login'])
        limiter.limit('5 per minute')(app.view_functions['auth.forgot_password'])
        limiter.limit('10 per minute')(app.view_functions['auth.verify_otp'])

    with app.app_context():
        db.create_all()
        # Migrate: add new columns to fish_species if they don't exist yet
        from sqlalchemy import text
        new_cols = [
            'wikipedia_image_url TEXT',
            'cooking_tips TEXT',
            'fishing_tips TEXT',
            'lifespan VARCHAR(80)',
            'reproduction TEXT',
            'economic_importance TEXT',
            'similar_species TEXT',
            'nutritional_info TEXT',
        ]
        with db.engine.connect() as conn:
            try:
                conn.execute(text('ALTER TABLE scan_history ADD COLUMN predicted_name VARCHAR(100)'))
                conn.commit()
            except Exception:
                pass
        with db.engine.connect() as conn:
            for col_def in new_cols:
                col_name = col_def.split()[0]
                try:
                    conn.execute(text(f'ALTER TABLE fish_species ADD COLUMN {col_def}'))
                    conn.commit()
                except Exception:
                    pass  # column already exists
        from seed_fish import seed_if_empty
        seed_if_empty()
        load_model()

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
