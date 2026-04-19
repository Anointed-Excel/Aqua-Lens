import os
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, PasswordResetOTP

EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')

auth_bp = Blueprint('auth', __name__)


def send_otp_email(to_email: str, otp: str, username: str) -> bool:
    """Send OTP via Gmail SMTP. Returns True on success."""
    mail_user = os.environ.get('MAIL_USERNAME')
    mail_pass = os.environ.get('MAIL_PASSWORD')

    if not mail_user or not mail_pass:
        # No email configured — print to console (visible in Render logs)
        print(f'[PASSWORD RESET] OTP for {to_email}: {otp}')
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Aqua Lens — Your Password Reset Code'
        msg['From'] = f'Aqua Lens <{mail_user}>'
        msg['To'] = to_email

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#0984e3;">🐠 Aqua Lens</h2>
          <p>Hi <strong>{username}</strong>,</p>
          <p>Your password reset code is:</p>
          <div style="background:#f0f4f8;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0984e3;">{otp}</span>
          </div>
          <p>This code expires in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #dfe6e9;margin:24px 0;">
          <p style="color:#b2bec3;font-size:12px;">Aqua Lens — Fish Identification App</p>
        </div>
        """
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(mail_user, mail_pass)
            server.sendmail(mail_user, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f'Email send error: {e}')
        return False


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400

    if not EMAIL_RE.match(email):
        return jsonify({'error': 'Invalid email address'}), 400

    if len(username) < 3 or len(username) > 30:
        return jsonify({'error': 'Username must be 3–30 characters'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Account created successfully',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'created_at': user.created_at.isoformat()
    }), 200


# ── Forgot password ────────────────────────────────────────────────────────────
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return success to prevent email enumeration attacks
    if not user:
        return jsonify({'message': 'If that email exists, an OTP has been sent'}), 200

    record, otp = PasswordResetOTP.generate(email)
    db.session.add(record)
    db.session.commit()

    send_otp_email(email, otp, user.username)

    return jsonify({'message': 'OTP sent to your email. Valid for 15 minutes.'}), 200


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify({'error': 'Email and OTP are required'}), 400

    record = PasswordResetOTP.query.filter_by(email=email, otp=otp).order_by(
        PasswordResetOTP.created_at.desc()
    ).first()

    if not record or not record.is_valid():
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    return jsonify({'message': 'OTP verified', 'valid': True}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()
    new_password = data.get('new_password', '')

    if not email or not otp or not new_password:
        return jsonify({'error': 'Email, OTP, and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    record = PasswordResetOTP.query.filter_by(email=email, otp=otp).order_by(
        PasswordResetOTP.created_at.desc()
    ).first()

    if not record or not record.is_valid():
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.password_hash = generate_password_hash(new_password)
    record.used = True
    db.session.commit()

    return jsonify({'message': 'Password reset successfully. Please log in.'}), 200
