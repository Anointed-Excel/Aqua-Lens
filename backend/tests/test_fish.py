"""Tests for /api/fish endpoints."""


def _register_and_token(client, suffix='0'):
    client.post('/api/auth/register', json={
        'username': f'fishtest{suffix}',
        'email': f'fishtest{suffix}@test.com',
        'password': 'password123',
    })
    r = client.post('/api/auth/login', json={
        'email': f'fishtest{suffix}@test.com',
        'password': 'password123',
    })
    return r.get_json()['access_token']


def _auth(token):
    return {'Authorization': f'Bearer {token}'}


def test_list_species_requires_auth(client):
    r = client.get('/api/fish/species')
    assert r.status_code == 401


def test_list_species(client):
    token = _register_and_token(client, '1')
    r = client.get('/api/fish/species', headers=_auth(token))
    assert r.status_code == 200
    data = r.get_json()
    assert 'fish' in data
    assert 'total' in data
    assert 'pages' in data


def test_list_species_pagination(client):
    token = _register_and_token(client, '2')
    r = client.get('/api/fish/species?page=1&per_page=5', headers=_auth(token))
    assert r.status_code == 200
    assert len(r.get_json()['fish']) <= 5


def test_list_species_per_page_capped(client):
    token = _register_and_token(client, '3')
    r = client.get('/api/fish/species?per_page=999', headers=_auth(token))
    assert r.status_code == 200
    assert len(r.get_json()['fish']) <= 50


def test_create_custom_fish(client):
    token = _register_and_token(client, '4')
    r = client.post('/api/fish/custom', json={'name': 'Test Fish', 'edible': 'Yes'}, headers=_auth(token))
    assert r.status_code == 201
    assert r.get_json()['name'] == 'Test Fish'


def test_create_custom_fish_no_name(client):
    token = _register_and_token(client, '5')
    r = client.post('/api/fish/custom', json={'edible': 'Yes'}, headers=_auth(token))
    assert r.status_code == 400


def test_custom_fish_name_too_long(client):
    token = _register_and_token(client, '6')
    r = client.post('/api/fish/custom', json={'name': 'A' * 101}, headers=_auth(token))
    assert r.status_code == 400


def test_list_custom_fish(client):
    token = _register_and_token(client, '7')
    client.post('/api/fish/custom', json={'name': 'MyFish'}, headers=_auth(token))
    r = client.get('/api/fish/custom', headers=_auth(token))
    assert r.status_code == 200
    assert any(f['name'] == 'MyFish' for f in r.get_json())


def test_delete_custom_fish(client):
    token = _register_and_token(client, '8')
    create = client.post('/api/fish/custom', json={'name': 'ToDelete'}, headers=_auth(token))
    fish_id = create.get_json()['id']
    r = client.delete(f'/api/fish/custom/{fish_id}', headers=_auth(token))
    assert r.status_code == 200


def test_contribute_empty_text(client):
    token = _register_and_token(client, '9')
    r = client.post('/api/fish/contribute', json={'contribution_text': '  ', 'fish_species_id': 1}, headers=_auth(token))
    assert r.status_code == 400


def test_contribute_text_too_long(client):
    token = _register_and_token(client, '10')
    r = client.post('/api/fish/contribute', json={
        'contribution_text': 'x' * 2001, 'fish_species_id': 1,
    }, headers=_auth(token))
    assert r.status_code == 400


def test_get_history(client):
    token = _register_and_token(client, '11')
    r = client.get('/api/fish/history', headers=_auth(token))
    assert r.status_code == 200
    data = r.get_json()
    assert 'history' in data
    assert 'total' in data


def test_species_search(client):
    token = _register_and_token(client, '12')
    r = client.get('/api/fish/species?q=Tilapia', headers=_auth(token))
    assert r.status_code == 200
    assert 'fish' in r.get_json()


def test_get_species_by_id(client, species_id):
    from unittest.mock import patch
    token = _register_and_token(client, '13')
    with patch('fish_routes.enrich_fish_with_text_ai', return_value=None):
        r = client.get(f'/api/fish/species/{species_id}', headers=_auth(token))
    assert r.status_code == 200
    data = r.get_json()
    assert data['id'] == species_id


def test_get_species_not_found(client):
    token = _register_and_token(client, '14')
    r = client.get('/api/fish/species/99999', headers=_auth(token))
    assert r.status_code == 404


def test_update_custom_fish(client):
    token = _register_and_token(client, '15')
    create = client.post('/api/fish/custom', json={'name': 'UpdateMe'}, headers=_auth(token))
    fish_id = create.get_json()['id']
    r = client.put(f'/api/fish/custom/{fish_id}', json={'name': 'UpdatedName'}, headers=_auth(token))
    assert r.status_code == 200
    assert r.get_json()['name'] == 'UpdatedName'


def test_contribute_success(client, species_id):
    token = _register_and_token(client, '16')
    r = client.post('/api/fish/contribute', json={
        'contribution_text': 'Great fish found near coral reefs.',
        'fish_species_id': species_id,
        'field_name': 'general',
    }, headers=_auth(token))
    assert r.status_code == 201
    data = r.get_json()
    assert data['field_name'] == 'general'
    assert 'id' in data


def test_favourite_add_and_remove(client, species_id):
    token = _register_and_token(client, '17')
    r = client.post(f'/api/fish/favourite/{species_id}', headers=_auth(token))
    assert r.status_code == 201
    # Add same fish again → already favourited
    r2 = client.post(f'/api/fish/favourite/{species_id}', headers=_auth(token))
    assert r2.status_code == 200
    assert 'Already' in r2.get_json()['message']
    # Remove
    r3 = client.delete(f'/api/fish/favourite/{species_id}', headers=_auth(token))
    assert r3.status_code == 200


def test_list_favourites(client, species_id):
    token = _register_and_token(client, '18')
    client.post(f'/api/fish/favourite/{species_id}', headers=_auth(token))
    r = client.get('/api/fish/favourites', headers=_auth(token))
    assert r.status_code == 200
    items = r.get_json()
    assert isinstance(items, list)
    assert any(f['id'] == species_id for f in items)


def test_favourite_status(client, species_id):
    token = _register_and_token(client, '19')
    r = client.get(f'/api/fish/favourite/{species_id}/status', headers=_auth(token))
    assert r.status_code == 200
    assert r.get_json()['favourited'] is False
    client.post(f'/api/fish/favourite/{species_id}', headers=_auth(token))
    r2 = client.get(f'/api/fish/favourite/{species_id}/status', headers=_auth(token))
    assert r2.get_json()['favourited'] is True


def test_delete_scan(client, app):
    reg = client.post('/api/auth/register', json={
        'username': 'scandeleter', 'email': 'scandel@test.com', 'password': 'pass1234'
    })
    user_id = reg.get_json()['user']['id']
    token = reg.get_json()['access_token']
    with app.app_context():
        from models import ScanHistory, db as _db
        scan = ScanHistory(user_id=user_id, status='unrecognized', confidence=0.0)
        _db.session.add(scan)
        _db.session.commit()
        scan_id = scan.id
    r = client.delete(f'/api/fish/history/{scan_id}', headers=_auth(token))
    assert r.status_code == 200


def test_delete_scan_other_user(client, app):
    reg_a = client.post('/api/auth/register', json={
        'username': 'userscanA', 'email': 'scanA@test.com', 'password': 'pass1234'
    })
    user_a_id = reg_a.get_json()['user']['id']
    reg_b = client.post('/api/auth/register', json={
        'username': 'userscanB', 'email': 'scanB@test.com', 'password': 'pass1234'
    })
    token_b = reg_b.get_json()['access_token']
    with app.app_context():
        from models import ScanHistory, db as _db
        scan = ScanHistory(user_id=user_a_id, status='unrecognized', confidence=0.0)
        _db.session.add(scan)
        _db.session.commit()
        scan_id = scan.id
    r = client.delete(f'/api/fish/history/{scan_id}', headers=_auth(token_b))
    assert r.status_code == 404
