"""
Vision AI integration for fish identification.
Supports Claude (Anthropic), Google Gemini, and OpenAI GPT-4o-mini.

Priority order (uses whichever API key is set):
  1. Claude  — set ANTHROPIC_API_KEY   (recommended, very accurate)
  2. Gemini  — set GEMINI_API_KEY      (free tier available)
  3. OpenAI  — set OPENAI_API_KEY      (gpt-4o-mini, cheap)

Or force a provider: VISION_AI_PROVIDER=claude|gemini|openai
"""

import os
import json
import base64
import urllib.request
import urllib.parse
from io import BytesIO

# ─── Prompt sent to every Vision AI provider ──────────────────────────────────
FISH_PROMPT = """You are an expert ichthyologist (fish scientist). Analyze this image and identify the fish species.

If a fish is clearly visible, return this exact JSON:
{
  "identified": true,
  "name": "Common name of the fish",
  "scientific_name": "Genus species",
  "family": "Family name",
  "water_type": "Freshwater or Saltwater or Brackish",
  "edible": "Yes or No or Caution",
  "danger_level": "Safe or Mildly Dangerous or Dangerous or Very Dangerous",
  "habitat": "Natural habitat description (rivers, reefs, depth range, etc.)",
  "diet": "What this fish eats and how it feeds",
  "average_size": "e.g. 20-40 cm",
  "max_size": "e.g. 150 cm",
  "weight_range": "e.g. 0.5-5 kg",
  "lifespan": "e.g. 5-10 years",
  "conservation_status": "e.g. Least Concern",
  "characteristics": "Physical appearance, markings, body shape, fins, colour",
  "description": "Overview, background, ecological role, and importance of the species",
  "native_regions": "Geographic range where naturally found",
  "reproduction": "Breeding season, spawning behaviour, clutch size, parental care",
  "economic_importance": "Commercial fishing value, aquaculture, sport fishing, aquarium trade",
  "cooking_tips": "How to prepare and best cooking methods (grilling, frying, steaming, etc.) and flavour profile",
  "fishing_tips": "Best bait or lures, fishing technique, season and time of day, habitat to target",
  "similar_species": "Fish species that look similar or could be confused with this one",
  "nutritional_info": "Calories per 100g, protein, fat, omega-3 content, mercury level (Low/Medium/High)",
  "fun_facts": "2-3 interesting facts about this species",
  "confidence": 0.95
}

If no fish is visible or species cannot be determined:
{"identified": false, "confidence": 0.0}

Return ONLY valid JSON. No markdown. No code blocks. No extra text."""
# ──────────────────────────────────────────────────────────────────────────────


def _strip_fences(text: str) -> str:
    """Remove markdown code fences from an AI response."""
    text = text.strip()
    if text.startswith('```'):
        parts = text.split('```')
        text = parts[1].strip()
        if text.startswith('json'):
            text = text[4:].strip()
    return text


def _parse_response(text: str) -> dict | None:
    """Strip any markdown fences and parse JSON from an AI text response."""
    try:
        data = json.loads(_strip_fences(text))
        return data if data.get('identified') else None
    except (json.JSONDecodeError, AttributeError):
        return None


# ─── Claude (Anthropic) ───────────────────────────────────────────────────────
def _identify_with_claude(base64_image: str) -> dict | None:
    """
    Claude Haiku — fast, cheap, excellent vision.
    Requires: pip install anthropic  |  ANTHROPIC_API_KEY in .env
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model='claude-haiku-4-5-20251001',   # fast + cheap vision model
            max_tokens=1500,
            messages=[{
                'role': 'user',
                'content': [
                    {
                        'type': 'image',
                        'source': {
                            'type': 'base64',
                            'media_type': 'image/jpeg',
                            'data': base64_image,
                        },
                    },
                    {
                        'type': 'text',
                        'text': FISH_PROMPT,
                    },
                ],
            }],
        )
        return _parse_response(response.content[0].text)
    except Exception as e:
        print(f'[VisionAI] Claude error: {e}')
        return None


# ─── Google Gemini ────────────────────────────────────────────────────────────
def _get_gemini_keys() -> list[str]:
    """
    Collect all Gemini API keys from environment variables.
    Supports: GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... GEMINI_API_KEY_N
    Returns a deduplicated list preserving order (plain key first).
    """
    seen = set()
    keys = []
    for name in ['GEMINI_API_KEY'] + [f'GEMINI_API_KEY_{i}' for i in range(1, 20)]:
        val = os.environ.get(name, '').strip()
        if val and val not in seen:
            seen.add(val)
            keys.append(val)
    return keys


def _identify_with_gemini(base64_image: str) -> dict | None:
    """
    Gemini — free tier. Rotates through all configured API keys and tries
    multiple models per key, so quota exhaustion on one key automatically
    falls back to the next key.
    Requires: pip install google-genai  |  GEMINI_API_KEY (or _1/_2/...) in .env
    """
    keys = _get_gemini_keys()
    if not keys:
        return None
    try:
        from google import genai
        from google.genai import types

        image_bytes = base64.b64decode(base64_image)

        for key_idx, api_key in enumerate(keys):
            client = genai.Client(api_key=api_key)
            key_label = f'key_{key_idx + 1}' if key_idx > 0 else 'key_1'
            for model_name in ('gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-exp'):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                            types.Part.from_text(text=FISH_PROMPT),
                        ],
                    )
                    result = _parse_response(response.text)
                    if result:
                        print(f'[VisionAI] Gemini model used: {model_name} ({key_label})')
                        return result
                except Exception as e:
                    err_str = str(e)
                    if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
                        print(f'[VisionAI] Gemini {model_name} ({key_label}) quota exhausted — trying next key')
                        break   # skip remaining models on this key, try next key
                    print(f'[VisionAI] Gemini {model_name} ({key_label}) error: {e}')
                    continue
        return None
    except Exception as e:
        print(f'[VisionAI] Gemini error: {e}')
        return None


# ─── OpenAI GPT-4o-mini ───────────────────────────────────────────────────────
def _identify_with_openai(base64_image: str) -> dict | None:
    """
    GPT-4o-mini — ~$0.00015 per image.
    Requires: pip install openai  |  OPENAI_API_KEY in .env
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model='gpt-5.4-mini',
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': FISH_PROMPT},
                    {
                        'type': 'image_url',
                        'image_url': {
                            'url': f'data:image/jpeg;base64,{base64_image}',
                            'detail': 'low',
                        },
                    },
                ],
            }],
            max_completion_tokens=900,
            temperature=0.1,
        )
        return _parse_response(response.choices[0].message.content)
    except Exception as e:
        print(f'[VisionAI] OpenAI error: {e}')
        return None


# ─── Main entry point ─────────────────────────────────────────────────────────
def identify_fish_with_vision_ai(base64_image: str) -> dict | None:
    """
    Identify a fish from a base64-encoded image.
    Tries providers in priority order: Claude → Gemini → OpenAI
    Returns a structured dict or None if identification fails.
    """
    provider = os.environ.get('VISION_AI_PROVIDER', '').lower()

    if provider == 'claude':
        result = _identify_with_claude(base64_image)
    elif provider == 'gemini':
        result = _identify_with_gemini(base64_image)
    elif provider == 'openai':
        result = _identify_with_openai(base64_image)
    else:
        # Auto: try in order of preference
        result = _identify_with_claude(base64_image)
        if result is None:
            result = _identify_with_gemini(base64_image)
        if result is None:
            result = _identify_with_openai(base64_image)

    if result:
        print(f'[VisionAI] Identified: {result.get("name")} '
              f'(confidence={result.get("confidence", "?")})')
    else:
        print('[VisionAI] Could not identify fish.')

    return result


def fetch_wikipedia_image(fish_name: str) -> str | None:
    """
    Fetch a reference image URL from Wikipedia for a given fish name.
    Uses the free Wikipedia REST API — no key required.
    """
    try:
        encoded = urllib.parse.quote(fish_name.replace(' ', '_'))
        url = f'https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}'
        req = urllib.request.Request(url, headers={'User-Agent': 'AquaLens-FishID/1.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read())
            img = data.get('thumbnail', {}).get('source') or data.get('originalimage', {}).get('source')
            if img:
                print(f'[Wikipedia] Found image for {fish_name}')
            return img
    except Exception as e:
        print(f'[Wikipedia] Could not fetch image for {fish_name}: {e}')
        return None


_ENRICH_PROMPT = (
    'You are an expert ichthyologist. Provide detailed factual information about the fish species: {name}.\n\n'
    'Return ONLY this JSON (no markdown, no extra text):\n'
    '{{\n'
    '  "lifespan": "e.g. 5-10 years",\n'
    '  "reproduction": "breeding season, spawning behaviour, clutch size, parental care",\n'
    '  "economic_importance": "commercial fishing, aquaculture, sport fishing, aquarium trade value",\n'
    '  "cooking_tips": "preparation methods, best cooking techniques, flavour profile",\n'
    '  "fishing_tips": "best bait or lures, technique, season, time of day, habitat to target",\n'
    '  "similar_species": "species that look similar or are commonly confused with this fish",\n'
    '  "nutritional_info": "approx. calories/100g, protein g, fat g, omega-3, mercury level (Low/Medium/High)"\n'
    '}}'
)


def enrich_fish_with_text_ai(fish_name: str, scientific_name: str = None) -> dict | None:
    """
    Use AI (text only, no image) to fill in missing detail fields for a known fish species.
    Tries providers in the same priority order as identify_fish_with_vision_ai.
    """
    name_str = fish_name + (f' ({scientific_name})' if scientific_name else '')
    prompt = _ENRICH_PROMPT.format(name=name_str)
    result = None

    # Try Claude
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model='claude-haiku-4-5-20251001',
                max_tokens=800,
                messages=[{'role': 'user', 'content': prompt}],
            )
            result = json.loads(_strip_fences(resp.content[0].text))
        except Exception as e:
            print(f'[Enrich] Claude error: {e}')

    # Try Gemini (rotate through all configured keys)
    if result is None:
        gemini_keys = _get_gemini_keys()
        if gemini_keys:
            try:
                from google import genai
                from google.genai import types
                for key_idx, api_key in enumerate(gemini_keys):
                    client = genai.Client(api_key=api_key)
                    key_label = f'key_{key_idx + 1}'
                    for model_name in ('gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-exp'):
                        try:
                            resp = client.models.generate_content(
                                model=model_name,
                                contents=[types.Part.from_text(text=prompt)],
                            )
                            result = json.loads(_strip_fences(resp.text))
                            break
                        except Exception as e:
                            err_str = str(e)
                            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
                                print(f'[Enrich] Gemini {model_name} ({key_label}) quota exhausted — trying next key')
                                break
                            print(f'[Enrich] Gemini {model_name} ({key_label}) error: {e}')
                            continue
                    if result is not None:
                        break
            except Exception as e:
                print(f'[Enrich] Gemini error: {e}')

    # Try OpenAI
    if result is None:
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                resp = client.chat.completions.create(
                    model='gpt-5.4-mini',
                    messages=[{'role': 'user', 'content': prompt}],
                    max_completion_tokens=800, temperature=0.1,
                )
                result = json.loads(_strip_fences(resp.choices[0].message.content))
            except Exception as e:
                print(f'[Enrich] OpenAI error: {e}')

    if result:
        # Coerce any list values to strings (AI sometimes returns lists)
        for k, v in result.items():
            result[k] = _to_str(v)
        wiki_img = fetch_wikipedia_image(fish_name)
        if wiki_img:
            result['wikipedia_image_url'] = wiki_img
        print(f'[Enrich] Enriched text data for: {fish_name}')
    return result


def _to_str(v) -> str | None:
    """Coerce AI output values to strings — AI sometimes returns lists instead of strings."""
    if v is None:
        return None
    if isinstance(v, list):
        return '\n• '.join(str(x).strip() for x in v if x)
    return str(v) if not isinstance(v, str) else v


def vision_data_to_fish_dict(data: dict) -> dict:
    """
    Convert a Vision AI result to the same shape as _species_to_dict()
    so the frontend receives a consistent fish object regardless of source.
    """
    wikipedia_img = fetch_wikipedia_image(data.get('name', ''))
    return {
        'id': None,
        'name': _to_str(data.get('name')) or 'Unknown Fish',
        'scientific_name': _to_str(data.get('scientific_name')),
        'family': _to_str(data.get('family')),
        'habitat': _to_str(data.get('habitat')),
        'diet': _to_str(data.get('diet')),
        'average_size': _to_str(data.get('average_size')),
        'max_size': _to_str(data.get('max_size')),
        'weight_range': _to_str(data.get('weight_range')),
        'lifespan': _to_str(data.get('lifespan')),
        'danger_level': _to_str(data.get('danger_level')) or 'Unknown',
        'edible': _to_str(data.get('edible')) or 'Unknown',
        'conservation_status': _to_str(data.get('conservation_status')),
        'characteristics': _to_str(data.get('characteristics')),
        'description': _to_str(data.get('description')),
        'fun_facts': _to_str(data.get('fun_facts')),
        'native_regions': _to_str(data.get('native_regions')),
        'water_type': _to_str(data.get('water_type')),
        'reproduction': _to_str(data.get('reproduction')),
        'economic_importance': _to_str(data.get('economic_importance')),
        'cooking_tips': _to_str(data.get('cooking_tips')),
        'fishing_tips': _to_str(data.get('fishing_tips')),
        'similar_species': _to_str(data.get('similar_species')),
        'nutritional_info': _to_str(data.get('nutritional_info')),
        'image_url': None,
        'wikipedia_image_url': wikipedia_img,
        'in_model': False,
        'source': 'vision_ai',
    }
