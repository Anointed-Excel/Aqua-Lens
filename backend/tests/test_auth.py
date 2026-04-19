"""Tests for /api/auth endpoints."""
import json


def _reg(client, username='fisher1', email='fisher@test.com', password='secret123'):
    return client.post('/api/auth/register', json={
        'username': username, 'email': email, 'password': password,
    })


def test_register_success(client):
    r = _reg(client)
    assert r.status_code == 201
    data = r.get_json()
    assert 'access_token' in data
    assert data['user']['email'] == 'fisher@test.com'


def test_register_duplicate_email(client):
    _reg(client, username='dup1', email='dup@test.com')
    r = _reg(client, username='dup2', email='dup@test.com')
    assert r.status_code == 409
    assert 'Email' in r.get_json()['error']


def test_register_invalid_email(client):
    r = _reg(client, username='inv1', email='not-an-email')
    assert r.status_code == 400


def test_register_short_password(client):
    r = _reg(client, username='shp1', email='short@test.com', password='abc')
    assert r.status_code == 400


def test_login_success(client):
    _reg(client, username='loginuser', email='login@test.com', password='mypassword')
    r = client.post('/api/auth/login', json={'email': 'login@test.com', 'password': 'mypassword'})
    assert r.status_code == 200
    assert 'access_token' in r.get_json()


def test_login_wrong_password(client):
    _reg(client, username='wrongpass', email='wp@test.com', password='correct')
    r = client.post('/api/auth/login', json={'email': 'wp@test.com', 'password': 'wrong'})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post('/api/auth/login', json={'email': 'nobody@test.com', 'password': 'abc'})
    assert r.status_code == 401


def test_get_me(client):
    _reg(client, username='meuser', email='me@test.com', password='mypass99')
    login = client.post('/api/auth/login', json={'email': 'me@test.com', 'password': 'mypass99'})
    token = login.get_json()['access_token']
    r = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.get_json()['email'] == 'me@test.com'


def test_get_me_no_token(client):
    r = client.get('/api/auth/me')
    assert r.status_code == 401


def test_forgot_password_always_200(client):
    # Should return 200 even for unknown emails (prevent enumeration)
    r = client.post('/api/auth/forgot-password', json={'email': 'unknown@test.com'})
    assert r.status_code == 200


def test_register_duplicate_username(client):
    _reg(client, username='dupusr', email='dupusr1@test.com')
    r = _reg(client, username='dupusr', email='dupusr2@test.com')
    assert r.status_code == 409
    assert 'Username' in r.get_json()['error']


def test_register_missing_fields(client):
    r = client.post('/api/auth/register', json={'username': 'abc', 'email': 'x@x.com'})
    assert r.status_code == 400


def test_refresh_token(client):
    _reg(client, username='refuser', email='ref@test.com', password='pass123')
    login = client.post('/api/auth/login', json={'email': 'ref@test.com', 'password': 'pass123'})
    refresh_token = login.get_json()['refresh_token']
    r = client.post('/api/auth/refresh', headers={'Authorization': f'Bearer {refresh_token}'})
    assert r.status_code == 200
    assert 'access_token' in r.get_json()


def test_verify_otp_invalid(client):
    r = client.post('/api/auth/verify-otp', json={'email': 'nobody@test.com', 'otp': '000000'})
    assert r.status_code == 400


def test_verify_otp_missing_fields(client):
    r = client.post('/api/auth/verify-otp', json={'email': 'x@x.com'})
    assert r.status_code == 400


def test_reset_password_missing_fields(client):
    r = client.post('/api/auth/reset-password', json={'email': 'x@x.com'})
    assert r.status_code == 400


def test_reset_password_invalid_otp(client):
    r = client.post('/api/auth/reset-password', json={
        'email': 'nobody@test.com', 'otp': '000000', 'new_password': 'newpass123'
    })
    assert r.status_code == 400
