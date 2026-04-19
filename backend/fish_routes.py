import os
import base64
import numpy as np
from io import BytesIO
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from PIL import Image
from models import db, FishSpecies, ScanHistory, CustomFish, FishContribution, FavoriteFish
from cloudinary_config import upload_base64_image, upload_file_object
from vision_ai import identify_fish_with_vision_ai, vision_data_to_fish_dict, fetch_wikipedia_image, enrich_fish_with_text_ai

fish_bp = Blueprint('fish', __name__)

# ── Model loading ──────────────────────────────────────────────────────────────
model = None
CLASS_NAMES = [
    'Bangus', 'Big Head Carp', 'Black Spotted Barb', 'Catfish', 'Climbing Perch',
    'Fourfinger Threadfin', 'Freshwater Eel', 'Glass Perchlet', 'Goby', 'Gold Fish',
    'Gourami', 'Grass Carp', 'Green Spotted Puffer', 'Indian Carp', 'Indo-Pacific Tarpon',
    'Jaguar Gapote', 'Janitor Fish', 'Knifefish', 'Long-Snouted Pipefish', 'Mosquito Fish',
    'Mudfish', 'Mullet', 'Pangasius', 'Perch', 'Scat Fish', 'Silver Barb', 'Silver Carp',
    'Silver Perch', 'Snakehead', 'Tenpounder', 'Tilapia'
]

CONFIDENCE_HIGH = float(os.environ.get('CONFIDENCE_HIGH', 0.70))
CONFIDENCE_LOW  = float(os.environ.get('CONFIDENCE_LOW', 0.50))

ALLOWED_IMAGE_FORMATS = {'JPEG', 'JPG', 'PNG', 'WEBP', 'BMP'}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_CONTRIBUTION_LENGTH = 2000
ALLOWED_FIELD_NAMES = {'general', 'habitat', 'diet', 'cooking', 'fishing_tips', 'danger'}


def load_model():
    global model
    model_path = os.path.join(os.path.dirname(__file__), 'FishModelClassifier.h5')
    if os.path.exists(model_path):
        try:
            from tensorflow.keras.models import load_model as keras_load
            model = keras_load(model_path, compile=False)
            print('Fish model loaded successfully.')
        except Exception as e:
            print(f'Could not load model: {e}')
    else:
        print('WARNING: FishModelClassifier.h5 not found. Place it in the backend folder.')


def preprocess_image(img: Image.Image) -> np.ndarray:
    img = img.convert('RGB').resize((224, 224))
    arr = np.array(img) / 255.0
    return np.expand_dims(arr, axis=0)


def predict_fish(img: Image.Image):
    if model is None:
        return None, 0.0, []
    arr = preprocess_image(img)
    preds = model.predict(arr)[0]
    top5_idx = np.argsort(preds)[::-1][:5]
    top5 = [{'name': CLASS_NAMES[i], 'confidence': float(preds[i])} for i in top5_idx]
    best_idx = int(np.argmax(preds))
    return CLASS_NAMES[best_idx], float(preds[best_idx]), top5


# ── Predict endpoint ───────────────────────────────────────────────────────────
@fish_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    user_id = int(get_jwt_identity())
    img = None

    # Accept base64 JSON body OR multipart file
    base64_str = None
    if request.content_type and 'multipart/form-data' in request.content_type:
        file = request.files.get('image')
        if not file:
            return jsonify({'error': 'No image file provided'}), 400
        raw = file.read()
        if len(raw) > MAX_IMAGE_BYTES:
            return jsonify({'error': 'Image too large. Maximum size is 10 MB'}), 413
        base64_str = base64.b64encode(raw).decode('utf-8')
        try:
            img = Image.open(BytesIO(raw))
        except Exception:
            return jsonify({'error': 'Invalid or corrupt image file'}), 400
    else:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        try:
            base64_str = data['image']
            image_data = base64.b64decode(base64_str)
            if len(image_data) > MAX_IMAGE_BYTES:
                return jsonify({'error': 'Image too large. Maximum size is 10 MB'}), 413
            img = Image.open(BytesIO(image_data))
        except Exception:
            return jsonify({'error': 'Invalid base64 image data'}), 400

    if img.format and img.format.upper() not in ALLOWED_IMAGE_FORMATS:
        return jsonify({'error': f'Unsupported image format. Use JPEG, PNG, or WEBP'}), 400

    # ── Step 1: run local InceptionV3 model ────────────────────────────────────
    fish_name, confidence, top5 = predict_fish(img)
    used_vision_ai = False
    vision_fish_dict = None

    location = request.form.get('location') or (request.get_json(silent=True) or {}).get('location')

    # ── Step 2: Vision AI fallback ──────────────────────────────────────────────
    # Use Vision AI when:
    #  • the local model is not loaded at all, OR
    #  • the local model is not confident enough (< CONFIDENCE_HIGH)
    if model is None or confidence < CONFIDENCE_HIGH:
        vision_data = identify_fish_with_vision_ai(base64_str)
        if vision_data:
            used_vision_ai = True
            fish_name = vision_data.get('name', fish_name)
            confidence = vision_data.get('confidence', 0.92)
            vision_fish_dict = vision_data_to_fish_dict(vision_data)

    # ── Step 3: determine status ────────────────────────────────────────────────
    if used_vision_ai and vision_fish_dict:
        status = 'identified'
    elif confidence >= CONFIDENCE_HIGH:
        status = 'identified'
    elif confidence >= CONFIDENCE_LOW:
        status = 'low_confidence'
    else:
        status = 'unrecognized'

    # ── Step 4: look up fish in database ────────────────────────────────────────
    fish_species = None
    if status != 'unrecognized' and fish_name:
        fish_species = FishSpecies.query.filter(
            db.func.lower(FishSpecies.name) == fish_name.lower()
        ).first()

    # ── Step 5a: enrich existing species with new fields if they are missing ─────
    NEW_FIELDS = ['lifespan', 'reproduction', 'economic_importance', 'cooking_tips',
                  'fishing_tips', 'similar_species', 'nutritional_info', 'wikipedia_image_url']
    if used_vision_ai and vision_fish_dict and fish_species is not None:
        needs_update = any(getattr(fish_species, f, None) is None for f in NEW_FIELDS)
        if needs_update:
            for f in NEW_FIELDS:
                if getattr(fish_species, f, None) is None and vision_fish_dict.get(f):
                    setattr(fish_species, f, vision_fish_dict[f])
            try:
                db.session.commit()
                print(f'[VisionAI] Enriched existing species: {fish_species.name}')
            except Exception as e:
                print(f'[VisionAI] Could not enrich species: {e}')
                db.session.rollback()

    # ── Step 5b: auto-save Vision AI fish to DB if it's a new species ────────────
    if used_vision_ai and vision_fish_dict and fish_species is None and vision_fish_dict.get('name'):
        try:
            new_species = FishSpecies(
                name=vision_fish_dict['name'].strip(),
                scientific_name=vision_fish_dict.get('scientific_name'),
                family=vision_fish_dict.get('family'),
                habitat=vision_fish_dict.get('habitat'),
                diet=vision_fish_dict.get('diet'),
                average_size=vision_fish_dict.get('average_size'),
                max_size=vision_fish_dict.get('max_size'),
                weight_range=vision_fish_dict.get('weight_range'),
                lifespan=vision_fish_dict.get('lifespan'),
                danger_level=vision_fish_dict.get('danger_level', 'Unknown'),
                edible=vision_fish_dict.get('edible', 'Unknown'),
                conservation_status=vision_fish_dict.get('conservation_status'),
                characteristics=vision_fish_dict.get('characteristics'),
                description=vision_fish_dict.get('description'),
                fun_facts=vision_fish_dict.get('fun_facts'),
                native_regions=vision_fish_dict.get('native_regions'),
                water_type=vision_fish_dict.get('water_type'),
                reproduction=vision_fish_dict.get('reproduction'),
                economic_importance=vision_fish_dict.get('economic_importance'),
                cooking_tips=vision_fish_dict.get('cooking_tips'),
                fishing_tips=vision_fish_dict.get('fishing_tips'),
                similar_species=vision_fish_dict.get('similar_species'),
                nutritional_info=vision_fish_dict.get('nutritional_info'),
                wikipedia_image_url=vision_fish_dict.get('wikipedia_image_url'),
                in_model=False,
            )
            db.session.add(new_species)
            db.session.commit()
            fish_species = new_species
            vision_fish_dict['id'] = new_species.id
            print(f'[VisionAI] Auto-saved new species to DB: {new_species.name}')
        except Exception as e:
            print(f'[VisionAI] Could not auto-save species: {e}')
            db.session.rollback()
            # Species likely already exists — look it up so the scan still links to it
            fish_species = FishSpecies.query.filter(
                db.func.lower(FishSpecies.name) == vision_fish_dict['name'].strip().lower()
            ).first()

    # ── Step 6: build final fish dict ───────────────────────────────────────────
    if fish_species:
        fish_dict = _species_to_dict(fish_species)
        if used_vision_ai:
            fish_dict['source'] = 'vision_ai'
    elif vision_fish_dict:
        fish_dict = vision_fish_dict
    else:
        fish_dict = None

    # ── Step 7: upload scan image to Cloudinary ─────────────────────────────────
    image_url = upload_base64_image(base64_str, folder='fishid/scans')

    # Use scan image as the species reference photo if none exists yet
    if fish_species and not fish_species.image_url and image_url:
        fish_species.image_url = image_url
        if fish_dict:
            fish_dict['image_url'] = image_url
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    # ── Step 8: save scan history ───────────────────────────────────────────────
    scan = ScanHistory(
        user_id=user_id,
        fish_species_id=fish_species.id if fish_species else None,
        confidence=confidence,
        location=location,
        status=status,
        image_url=image_url,
        predicted_name=fish_name if fish_name else None,
    )
    db.session.add(scan)
    db.session.commit()

    return jsonify({
        'status': status,
        'confidence': round(confidence * 100, 2),
        'predicted_name': fish_name if status != 'unrecognized' else None,
        'top5': top5,
        'scan_id': scan.id,
        'image_url': image_url,
        'fish': fish_dict,
        'identified_by': 'vision_ai' if used_vision_ai else 'model',
    }), 200


# ── Image upload endpoint (for manual entry photos) ───────────────────────────
@fish_bp.route('/upload-image', methods=['POST'])
@jwt_required()
def upload_image():
    """Upload an image to Cloudinary and return the URL."""
    base64_str = None

    if request.content_type and 'multipart/form-data' in request.content_type:
        file = request.files.get('image')
        if not file:
            return jsonify({'error': 'No image file provided'}), 400
        url = upload_file_object(file, folder='fishid/custom')
    else:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        url = upload_base64_image(data['image'], folder='fishid/custom')

    if not url:
        return jsonify({'error': 'Image upload failed'}), 500

    return jsonify({'url': url}), 200


# ── Fish species ───────────────────────────────────────────────────────────────
@fish_bp.route('/species', methods=['GET'])
@jwt_required()
def list_species():
    search = request.args.get('q', '').strip()
    water = request.args.get('water_type')
    edible = request.args.get('edible')
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(50, max(1, int(request.args.get('per_page', 20))))

    query = FishSpecies.query
    if search:
        query = query.filter(
            FishSpecies.name.ilike(f'%{search}%') |
            FishSpecies.scientific_name.ilike(f'%{search}%')
        )
    if water:
        query = query.filter_by(water_type=water)
    if edible:
        query = query.filter_by(edible=edible)

    pagination = query.order_by(FishSpecies.name).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'fish': [_species_to_dict(f) for f in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


_ENRICH_FIELDS = ['lifespan', 'reproduction', 'economic_importance', 'cooking_tips',
                   'fishing_tips', 'similar_species', 'nutritional_info']


@fish_bp.route('/species/<int:fish_id>', methods=['GET'])
@jwt_required()
def get_species(fish_id):
    fish = db.session.get(FishSpecies, fish_id)
    if fish is None:
        return jsonify({'error': 'Fish not found'}), 404

    # One-time enrichment: if any detail field is still NULL, call text AI to fill them in
    if any(getattr(fish, f, None) is None for f in _ENRICH_FIELDS):
        try:
            enrichment = enrich_fish_with_text_ai(fish.name, fish.scientific_name)
            if enrichment:
                for f in _ENRICH_FIELDS:
                    if getattr(fish, f, None) is None and enrichment.get(f):
                        setattr(fish, f, enrichment[f])
                if not fish.wikipedia_image_url and enrichment.get('wikipedia_image_url'):
                    fish.wikipedia_image_url = enrichment['wikipedia_image_url']
                db.session.commit()
                print(f'[Enrich] Stored enriched data for: {fish.name}')
        except Exception as e:
            db.session.rollback()
            print(f'[Enrich] Failed for {fish.name}: {e}')

    contributions = FishContribution.query.filter_by(
        fish_species_id=fish_id, approved=True
    ).order_by(FishContribution.created_at.desc()).all()
    data = _species_to_dict(fish)
    data['contributions'] = [_contribution_to_dict(c) for c in contributions]
    return jsonify(data), 200


# ── Scan history ───────────────────────────────────────────────────────────────
@fish_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = int(get_jwt_identity())
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(50, max(1, int(request.args.get('per_page', 20))))

    pagination = ScanHistory.query.filter_by(user_id=user_id)\
        .order_by(ScanHistory.scanned_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'history': [_scan_to_dict(s) for s in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@fish_bp.route('/history/<int:scan_id>', methods=['DELETE'])
@jwt_required()
def delete_scan(scan_id):
    user_id = int(get_jwt_identity())
    scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first_or_404()
    db.session.delete(scan)
    db.session.commit()
    return jsonify({'message': 'Scan deleted'}), 200


# ── Custom fish (manual entry) ─────────────────────────────────────────────────
@fish_bp.route('/custom', methods=['POST'])
@jwt_required()
def create_custom_fish():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = (data.get('name') or '').strip() if data else ''
    if not name:
        return jsonify({'error': 'Fish name is required'}), 400
    if len(name) > 100:
        return jsonify({'error': 'Fish name must be under 100 characters'}), 400

    fish = CustomFish(
        user_id=user_id,
        name=data.get('name'),
        scientific_name=data.get('scientific_name'),
        characteristics=data.get('characteristics'),
        edible=data.get('edible'),
        habitat=data.get('habitat'),
        diet=data.get('diet'),
        average_size=data.get('average_size'),
        danger_level=data.get('danger_level'),
        description=data.get('description'),
        image_url=data.get('image_url'),
        location_caught=data.get('location_caught'),
        weight=data.get('weight'),
        water_type=data.get('water_type'),
        additional_info=data.get('additional_info')
    )
    db.session.add(fish)
    db.session.commit()

    # link to the scan that triggered this if provided
    scan_id = data.get('scan_id')
    if scan_id:
        scan = ScanHistory.query.filter_by(id=scan_id, user_id=user_id).first()
        if scan:
            scan.custom_fish_id = fish.id
            db.session.commit()

    return jsonify(_custom_fish_to_dict(fish)), 201


@fish_bp.route('/custom', methods=['GET'])
@jwt_required()
def list_custom_fish():
    user_id = int(get_jwt_identity())
    fish_list = CustomFish.query.filter_by(user_id=user_id)\
        .order_by(CustomFish.created_at.desc()).all()
    return jsonify([_custom_fish_to_dict(f) for f in fish_list]), 200


@fish_bp.route('/custom/<int:fish_id>', methods=['PUT'])
@jwt_required()
def update_custom_fish(fish_id):
    user_id = int(get_jwt_identity())
    fish = CustomFish.query.filter_by(id=fish_id, user_id=user_id).first_or_404()
    data = request.get_json()
    fields = ['name', 'scientific_name', 'characteristics', 'edible', 'habitat',
              'diet', 'average_size', 'danger_level', 'description', 'image_url',
              'location_caught', 'weight', 'water_type', 'additional_info']
    for f in fields:
        if f in data:
            setattr(fish, f, data[f])
    db.session.commit()
    return jsonify(_custom_fish_to_dict(fish)), 200


@fish_bp.route('/custom/<int:fish_id>', methods=['DELETE'])
@jwt_required()
def delete_custom_fish(fish_id):
    user_id = int(get_jwt_identity())
    fish = CustomFish.query.filter_by(id=fish_id, user_id=user_id).first_or_404()
    db.session.delete(fish)
    db.session.commit()
    return jsonify({'message': 'Custom fish deleted'}), 200


# ── Favourites ─────────────────────────────────────────────────────────────────
@fish_bp.route('/favourite/<int:fish_id>', methods=['POST'])
@jwt_required()
def add_favourite(fish_id):
    user_id = int(get_jwt_identity())
    if FavoriteFish.query.filter_by(user_id=user_id, fish_species_id=fish_id).first():
        return jsonify({'message': 'Already favourited'}), 200
    fav = FavoriteFish(user_id=user_id, fish_species_id=fish_id)
    db.session.add(fav)
    db.session.commit()
    return jsonify({'message': 'Added to favourites'}), 201


@fish_bp.route('/favourite/<int:fish_id>', methods=['DELETE'])
@jwt_required()
def remove_favourite(fish_id):
    user_id = int(get_jwt_identity())
    fav = FavoriteFish.query.filter_by(user_id=user_id, fish_species_id=fish_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return jsonify({'message': 'Removed from favourites'}), 200


@fish_bp.route('/favourites', methods=['GET'])
@jwt_required()
def list_favourites():
    user_id = int(get_jwt_identity())
    favs = FavoriteFish.query.filter_by(user_id=user_id).order_by(FavoriteFish.created_at.desc()).all()
    result = []
    for f in favs:
        species = db.session.get(FishSpecies, f.fish_species_id)
        if species:
            result.append(_species_to_dict(species))
    return jsonify(result), 200


@fish_bp.route('/favourite/<int:fish_id>/status', methods=['GET'])
@jwt_required()
def favourite_status(fish_id):
    user_id = int(get_jwt_identity())
    is_fav = FavoriteFish.query.filter_by(user_id=user_id, fish_species_id=fish_id).first() is not None
    return jsonify({'favourited': is_fav}), 200


# ── Contributions ──────────────────────────────────────────────────────────────
@fish_bp.route('/contribute', methods=['POST'])
@jwt_required()
def contribute():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    contribution_text = (data.get('contribution_text') or '').strip() if data else ''
    if not contribution_text:
        return jsonify({'error': 'Contribution text is required'}), 400
    if len(contribution_text) > MAX_CONTRIBUTION_LENGTH:
        return jsonify({'error': f'Contribution must be under {MAX_CONTRIBUTION_LENGTH} characters'}), 400

    field_name = data.get('field_name', 'general')
    if field_name not in ALLOWED_FIELD_NAMES:
        field_name = 'general'

    contrib = FishContribution(
        user_id=user_id,
        fish_species_id=data.get('fish_species_id'),
        custom_fish_id=data.get('custom_fish_id'),
        field_name=field_name,
        contribution_text=contribution_text
    )
    db.session.add(contrib)
    db.session.commit()
    return jsonify(_contribution_to_dict(contrib)), 201


# ── Serializers ────────────────────────────────────────────────────────────────
def _species_to_dict(f):
    if not f:
        return None
    return {
        'id': f.id,
        'name': f.name,
        'scientific_name': f.scientific_name,
        'family': f.family,
        'habitat': f.habitat,
        'diet': f.diet,
        'average_size': f.average_size,
        'max_size': f.max_size,
        'weight_range': f.weight_range,
        'danger_level': f.danger_level,
        'edible': f.edible,
        'conservation_status': f.conservation_status,
        'characteristics': f.characteristics,
        'description': f.description,
        'fun_facts': f.fun_facts,
        'native_regions': f.native_regions,
        'water_type': f.water_type,
        'image_url': f.image_url,
        'wikipedia_image_url': f.wikipedia_image_url,
        'cooking_tips': f.cooking_tips,
        'fishing_tips': f.fishing_tips,
        'lifespan': f.lifespan,
        'reproduction': f.reproduction,
        'economic_importance': f.economic_importance,
        'similar_species': f.similar_species,
        'nutritional_info': f.nutritional_info,
        'in_model': f.in_model
    }


def _custom_fish_to_dict(f):
    return {
        'id': f.id,
        'name': f.name,
        'scientific_name': f.scientific_name,
        'characteristics': f.characteristics,
        'edible': f.edible,
        'habitat': f.habitat,
        'diet': f.diet,
        'average_size': f.average_size,
        'danger_level': f.danger_level,
        'description': f.description,
        'image_url': f.image_url,
        'location_caught': f.location_caught,
        'weight': f.weight,
        'water_type': f.water_type,
        'additional_info': f.additional_info,
        'created_at': f.created_at.isoformat()
    }


def _scan_to_dict(s):
    return {
        'id': s.id,
        'confidence': round(s.confidence * 100, 2) if s.confidence is not None else None,
        'status': s.status,
        'location': s.location,
        'notes': s.notes,
        'image_url': s.image_url,
        'scanned_at': s.scanned_at.isoformat(),
        'predicted_name': s.predicted_name,
        'fish': _species_to_dict(s.fish_species) if s.fish_species else None,
        'custom_fish': _custom_fish_to_dict(s.custom_fish) if s.custom_fish else None
    }


def _contribution_to_dict(c):
    return {
        'id': c.id,
        'user_id': c.user_id,
        'field_name': c.field_name,
        'contribution_text': c.contribution_text,
        'created_at': c.created_at.isoformat()
    }
