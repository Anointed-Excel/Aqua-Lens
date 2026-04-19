import pytest
import os

os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('CLOUDINARY_CLOUD_NAME', 'test')
os.environ.setdefault('CLOUDINARY_API_KEY', 'test')
os.environ.setdefault('CLOUDINARY_API_SECRET', 'test')

from app import create_app
from models import db as _db


@pytest.fixture(scope='session')
def app():
    application = create_app()
    application.config['TESTING'] = True
    application.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with application.app_context():
        _db.create_all()
    yield application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    with app.app_context():
        yield _db
        _db.session.rollback()


@pytest.fixture(scope='session')
def species_id(app):
    """Return the ID of a seeded fish species (creates one if none exist)."""
    with app.app_context():
        from models import FishSpecies, db as _db2
        fish = FishSpecies.query.first()
        if fish:
            return fish.id
        f = FishSpecies(name='__TestFish__', danger_level='Safe', edible='Yes', in_model=False)
        _db2.session.add(f)
        _db2.session.commit()
        return f.id
