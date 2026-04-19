from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scans = db.relationship('ScanHistory', backref='user', lazy=True)
    custom_fish = db.relationship('CustomFish', backref='user', lazy=True)
    contributions = db.relationship('FishContribution', backref='user', lazy=True)


class FishSpecies(db.Model):
    __tablename__ = 'fish_species'
    __table_args__ = (
        db.Index('ix_fish_species_name', 'name'),
        db.Index('ix_fish_species_water_type', 'water_type'),
        db.Index('ix_fish_species_edible', 'edible'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    scientific_name = db.Column(db.String(150))
    family = db.Column(db.String(100))
    habitat = db.Column(db.Text)
    diet = db.Column(db.Text)
    average_size = db.Column(db.String(80))
    max_size = db.Column(db.String(80))
    weight_range = db.Column(db.String(80))
    danger_level = db.Column(db.String(50))   # Safe, Mildly Dangerous, Dangerous, Toxic
    edible = db.Column(db.String(20))          # Yes, No, Caution
    conservation_status = db.Column(db.String(80))
    characteristics = db.Column(db.Text)
    description = db.Column(db.Text)
    fun_facts = db.Column(db.Text)
    native_regions = db.Column(db.Text)
    water_type = db.Column(db.String(50))      # Freshwater, Saltwater, Brackish
    image_url = db.Column(db.String(500))
    wikipedia_image_url = db.Column(db.String(500))
    cooking_tips = db.Column(db.Text)
    fishing_tips = db.Column(db.Text)
    lifespan = db.Column(db.String(80))
    reproduction = db.Column(db.Text)
    economic_importance = db.Column(db.Text)
    similar_species = db.Column(db.Text)
    nutritional_info = db.Column(db.Text)
    in_model = db.Column(db.Boolean, default=False)  # True if the ML model can classify it
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scans = db.relationship('ScanHistory', backref='fish_species', lazy=True)
    contributions = db.relationship('FishContribution', backref='fish_species', lazy=True)


class ScanHistory(db.Model):
    __tablename__ = 'scan_history'
    __table_args__ = (
        db.Index('ix_scan_history_user_id', 'user_id'),
        db.Index('ix_scan_history_scanned_at', 'scanned_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    fish_species_id = db.Column(db.Integer, db.ForeignKey('fish_species.id'), nullable=True)
    custom_fish_id = db.Column(db.Integer, db.ForeignKey('custom_fish.id'), nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    image_url = db.Column(db.String(500))
    location = db.Column(db.String(200))
    notes = db.Column(db.Text)
    status = db.Column(db.String(30))  # identified, low_confidence, unrecognized
    predicted_name = db.Column(db.String(100))  # always store what AI identified
    scanned_at = db.Column(db.DateTime, default=datetime.utcnow)


class CustomFish(db.Model):
    __tablename__ = 'custom_fish'
    __table_args__ = (
        db.Index('ix_custom_fish_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    scientific_name = db.Column(db.String(150))
    characteristics = db.Column(db.Text)
    edible = db.Column(db.String(20))
    habitat = db.Column(db.Text)
    diet = db.Column(db.Text)
    average_size = db.Column(db.String(80))
    danger_level = db.Column(db.String(50))
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    location_caught = db.Column(db.String(200))
    weight = db.Column(db.String(80))
    water_type = db.Column(db.String(50))
    additional_info = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scans = db.relationship('ScanHistory', backref='custom_fish', lazy=True)


class PasswordResetOTP(db.Model):
    __tablename__ = 'password_reset_otps'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def generate(email):
        import random
        # Invalidate any previous OTPs for this email
        PasswordResetOTP.query.filter_by(email=email, used=False).update({'used': True})
        otp = f'{random.randint(0, 999999):06d}'
        record = PasswordResetOTP(
            email=email,
            otp=otp,
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        return record, otp

    def is_valid(self):
        return not self.used and datetime.utcnow() < self.expires_at


class FavoriteFish(db.Model):
    __tablename__ = 'favorite_fish'
    __table_args__ = (
        db.Index('ix_favorite_fish_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    fish_species_id = db.Column(db.Integer, db.ForeignKey('fish_species.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class FishContribution(db.Model):
    __tablename__ = 'fish_contributions'
    __table_args__ = (
        db.Index('ix_fish_contributions_fish_species_id', 'fish_species_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    fish_species_id = db.Column(db.Integer, db.ForeignKey('fish_species.id'), nullable=True)
    custom_fish_id = db.Column(db.Integer, db.ForeignKey('custom_fish.id'), nullable=True)
    field_name = db.Column(db.String(80))   # which field they're contributing to
    contribution_text = db.Column(db.Text, nullable=False)
    approved = db.Column(db.Boolean, default=True)  # set to False and add admin panel for production moderation
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
