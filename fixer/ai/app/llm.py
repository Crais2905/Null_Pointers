"""Gemini structured JSON transport with sanitized record/replay."""
import hashlib
import json
import math
import os
import tempfile
from pathlib import Path

CACHE = Path(__file__).resolve().parents[1] / 'cache'
DEFAULT_MODEL = 'gemini-3.8-flash'

class LlmTimeout(Exception):
    pass

class ReplayMiss(Exception):
    pass

class LlmUnavailable(Exception):
    """Safe operator-facing message; never includes SDK response or API key."""

def model_name():
    return os.getenv('LLM_MODEL', '').strip() or DEFAULT_MODEL

def replay_enabled():
    mode = os.getenv('REPLAY', 'auto').strip().lower()
    if mode == 'auto':
        return not bool(os.getenv('GEMINI_API_KEY', '').strip())
    if mode not in ('0', '1'):
        raise LlmUnavailable('REPLAY must be auto, 0 or 1')
    return mode == '1'

def cache_key(payload):
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def prompt():
    return (Path(__file__).parent / 'prompts/diagnose.md').read_text(encoding='utf-8')

def cache_path(payload, schema):
    key = cache_key({'provider': 'gemini', 'transport': 1, 'input': payload,
                     'schema': schema, 'model': model_name(), 'prompt': prompt()})
    return Path(os.getenv('LLM_CACHE_DIR', str(CACHE))) / f'{key}.json'

def call_llm(payload, output_schema):
    if replay_enabled():
        path = cache_path(payload, output_schema)
        if not path.exists():
            raise ReplayMiss('No cached diagnosis for these analysis inputs')
        return json.loads(path.read_text(encoding='utf-8'))['output']

    key = os.getenv('GEMINI_API_KEY', '').strip()
    if not key:
        raise LlmUnavailable('Set GEMINI_API_KEY in fixer/.env or use REPLAY=1')
    from google import genai
    from google.genai import types, errors
    import httpx
    try:
        seconds = float(os.getenv('LLM_TIMEOUT_SECONDS', '20'))
        if not math.isfinite(seconds) or not 0 < seconds <= 120:
            raise ValueError()
    except ValueError:
        raise LlmUnavailable('LLM_TIMEOUT_SECONDS must be between 0 and 120') from None

    client = None
    try:
        client = genai.Client(api_key=key, http_options=types.HttpOptions(
            timeout=max(1, int(seconds * 1000)), retry_options=types.HttpRetryOptions(attempts=1)))
        result = client.models.generate_content(
            model=model_name(), contents=json.dumps(payload, ensure_ascii=False),
            config=types.GenerateContentConfig(
                system_instruction=prompt(), temperature=0, max_output_tokens=8192,
                response_mime_type='application/json', response_json_schema=output_schema))
        if not result.text:
            raise ValueError('Gemini returned no JSON text')
        return json.loads(result.text)
    except httpx.TimeoutException:
        raise LlmTimeout('Gemini request timed out') from None
    except errors.APIError as exc:
        code = getattr(exc, 'code', None)
        if code in (408, 504):
            raise LlmTimeout('Gemini request timed out') from None
        if code in (401, 403):
            message = 'Gemini rejected the API key or its permissions'
        elif code == 429:
            message = 'Gemini quota or rate limit reached'
        elif code == 503:
            message = 'Gemini temporarily overloaded; try later or select another model'
        elif code == 404:
            message = 'Gemini model unavailable; check LLM_MODEL'
        else:
            message = 'Gemini request failed; check key, model and provider availability'
        raise LlmUnavailable(message) from None
    except httpx.RequestError:
        raise LlmUnavailable('Cannot connect to Gemini') from None
    finally:
        if client is not None:
            client.close()

def record(payload, schema, output):
    # Called only after Pydantic validation and masking in diagnose.py.
    path = cache_path(payload, schema)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as stream:
        json.dump({'output': output}, stream, ensure_ascii=False, indent=2)
        temp = Path(stream.name)
    temp.replace(path)
