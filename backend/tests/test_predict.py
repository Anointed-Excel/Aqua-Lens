"""Tests for POST /api/fish/predict"""
import base64
from io import BytesIO
from unittest.mock import patch

from PIL import Image


def _make_b64_jpeg():
    img = Image.new('RGB', (10, 10), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format='JPEG')
    return base64.b64encode(buf.getvalue()).decode()


def _register_and_token(client, suffix):
    reg = client.post('/api/auth/register', json={
        'username': f'prdt{suffix}',
        'email': f'prdt{suffix}@test.com',
        'password': 'password123',
    })
    return reg.get_json()['access_token']


def _auth(token):
    return {'Authorization': f'Bearer {token}'}


def test_predict_requires_auth(client):
    r = client.post('/api/fish/predict', json={'image': _make_b64_jpeg()})
    assert r.status_code == 401


def test_predict_no_image(client):
    token = _register_and_token(client, 'a')
    r = client.post('/api/fish/predict', json={}, headers=_auth(token))
    assert r.status_code == 400


def test_predict_invalid_base64(client):
    token = _register_and_token(client, 'b')
    r = client.post('/api/fish/predict', json={'image': '!!!not-base64!!!'}, headers=_auth(token))
    assert r.status_code == 400


def test_predict_unrecognized(client):
    """model=None + vision AI returns nothing → status=unrecognized."""
    token = _register_and_token(client, 'c')
    with patch('fish_routes.identify_fish_with_vision_ai', return_value=None), \
         patch('fish_routes.upload_base64_image', return_value=None):
        r = client.post('/api/fish/predict', json={'image': _make_b64_jpeg()}, headers=_auth(token))
    assert r.status_code == 200
    data = r.get_json()
    assert data['status'] == 'unrecognized'
    assert data['predicted_name'] is None
    assert 'scan_id' in data


def test_upload_image_requires_auth(client):
    r = client.post('/api/fish/upload-image', json={'image': _make_b64_jpeg()})
    assert r.status_code == 401


def test_upload_image_no_data(client):
    token = _register_and_token(client, 'e')
    r = client.post('/api/fish/upload-image', json={}, headers=_auth(token))
    assert r.status_code == 400


def test_upload_image_success(client):
    token = _register_and_token(client, 'f')
    with patch('fish_routes.upload_base64_image', return_value='http://img.example.com/upload.jpg'):
        r = client.post('/api/fish/upload-image', json={'image': _make_b64_jpeg()}, headers=_auth(token))
    assert r.status_code == 200
    assert r.get_json()['url'] == 'http://img.example.com/upload.jpg'


def test_upload_image_cloudinary_failure(client):
    token = _register_and_token(client, 'g')
    with patch('fish_routes.upload_base64_image', return_value=None):
        r = client.post('/api/fish/upload-image', json={'image': _make_b64_jpeg()}, headers=_auth(token))
    assert r.status_code == 500


def test_predict_identified_by_vision_ai(client):
    """Vision AI returns a fish → status=identified, correct fields returned."""
    token = _register_and_token(client, 'd')
    vision_result = {
        'name': 'Bangus',
        'confidence': 0.95,
        'scientific_name': 'Chanos chanos',
        'family': 'Chanidae',
        'habitat': 'Coastal marine waters',
        'diet': 'Algae',
        'danger_level': 'Safe',
        'edible': 'Yes',
    }
    fish_dict_mock = {'name': 'Bangus', 'id': None, 'danger_level': 'Safe', 'edible': 'Yes'}
    with patch('fish_routes.identify_fish_with_vision_ai', return_value=vision_result), \
         patch('fish_routes.vision_data_to_fish_dict', return_value=fish_dict_mock), \
         patch('fish_routes.upload_base64_image', return_value='http://img.example.com/fish.jpg'):
        r = client.post('/api/fish/predict', json={'image': _make_b64_jpeg()}, headers=_auth(token))
    assert r.status_code == 200
    data = r.get_json()
    assert data['status'] == 'identified'
    assert data['predicted_name'] == 'Bangus'
    assert data['identified_by'] == 'vision_ai'
    assert 'scan_id' in data
    assert data['confidence'] == 95.0
