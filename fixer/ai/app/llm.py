"""Sanitized LLM record/replay transport; supports Google Gemini (AQ./AIza) and Anthropic Claude."""
import hashlib
import json
import os
import tempfile
from pathlib import Path

CACHE = Path(__file__).resolve().parents[1] / 'cache'


def _load_env_files():
    """Load variables from fixer/.env or fixer/ai/.env if not already set in os.environ and not running pytest."""
    if 'PYTEST_CURRENT_TEST' in os.environ or 'pytest' in os.sys.modules:
        return
    root_dir = Path(__file__).resolve().parents[2]
    ai_dir = Path(__file__).resolve().parents[1]
    for env_path in (root_dir / '.env', ai_dir / '.env'):
        if env_path.is_file():
            for raw_line in env_path.read_text(encoding='utf-8').splitlines():
                line = raw_line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and (k not in os.environ or os.environ[k] == ''):
                    os.environ[k] = v


_load_env_files()


class LlmTimeout(Exception):
    pass


class ReplayMiss(Exception):
    pass


GEMINI_FALLBACK_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
]

FALLBACK_ANTHROPIC_MODELS = [
    'claude-sonnet-5-5',
    'claude-sonnet-4-6',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-haiku-5-5',
]

ALLOWED_CATEGORIES = {
    'PAYMENT_DUPLICATE', 'UNHANDLED_EXCEPTION', 'UPSTREAM_TIMEOUT',
    'AUTH_FAILURE', 'DATA_INCONSISTENCY', 'CONFIG_ERROR', 'UNKNOWN',
}
ALLOWED_SEVERITIES = {'P1', 'P2', 'P3'}
ALLOWED_SKILLS = {
    'java', 'spring', 'sql', 'payments', 'idempotency', 'caching', 'auth',
    'react', 'css', 'ux-states', 'devops', 'kubernetes', 'network', 'timeouts', 'observability',
}


def cache_key(payload):
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def _normalize_gemini_output(raw: dict, payload: dict) -> dict:
    """Sanitize LLM JSON output so it strictly conforms to Report schema (extra='forbid') and verbatim evidence quotes."""
    if not isinstance(raw, dict):
        return raw
    diag = raw.get('diagnosis') if isinstance(raw.get('diagnosis'), dict) else {}
    draft = raw.get('task_draft') if isinstance(raw.get('task_draft'), dict) else {}

    allowed_lines = {
        int(item['line']): str(item['text'])
        for item in (payload.get('evidence_pack') or [])
        if isinstance(item, dict) and isinstance(item.get('line'), int) and isinstance(item.get('text'), str)
    }
    valid_modules = {
        str(m['id'])
        for m in (payload.get('module_catalog') or [])
        if isinstance(m, dict) and m.get('id')
    }

    category = str(diag.get('category', 'UNKNOWN')).upper().strip()
    if category not in ALLOWED_CATEGORIES:
        category = 'UNKNOWN'

    severity = str(diag.get('severity', 'P2')).upper().strip()
    if severity not in ALLOWED_SEVERITIES:
        severity = 'P2'

    try:
        confidence = float(diag.get('confidence', 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    mod_id = diag.get('suspected_module_id')
    if not isinstance(mod_id, str) or mod_id not in valid_modules:
        mod_id = None

    raw_skills = diag.get('required_skills') if isinstance(diag.get('required_skills'), list) else []
    skills = [str(s).strip().lower() for s in raw_skills if str(s).strip().lower() in ALLOWED_SKILLS]

    raw_evidence = diag.get('evidence') if isinstance(diag.get('evidence'), list) else []
    normalized_evidence = []
    for ev in raw_evidence:
        if not isinstance(ev, dict):
            continue
        try:
            line_no = int(ev.get('line', 0))
        except (TypeError, ValueError):
            continue
        if line_no < 1 or line_no not in allowed_lines:
            continue
        line_text = allowed_lines[line_no]
        quote = str(ev.get('quote') or '').strip()
        if not quote or quote not in line_text:
            quote = line_text[:200]
        else:
            quote = quote[:200]
        if not quote:
            continue
        why = str(ev.get('why') or 'Підтвердження сигналу в логу').strip() or 'Підтвердження сигналу в логу'
        normalized_evidence.append({'line': line_no, 'quote': quote, 'why': why})

    repro = [str(x) for x in (diag.get('repro_steps') or []) if isinstance(x, (str, int, float))]
    unknowns = [str(x) for x in (diag.get('unknowns') or []) if isinstance(x, (str, int, float))]

    title = str(draft.get('title') or f'[{mod_id or "triage"}] {category}').strip()[:80]
    if not title:
        title = f'[{mod_id or "triage"}] {category}'[:80]
    desc_md = str(draft.get('description_md') or diag.get('root_cause') or 'Потрібно дослідити інцидент.').strip()
    criteria = [str(x).strip() for x in (draft.get('acceptance_criteria') or []) if str(x).strip()]
    if len(criteria) < 2:
        criteria = (criteria + ['Регресійний сценарій проходить', 'Помилку оброблено та зафіксовано в логу'])[:2]
    elif len(criteria) > 4:
        criteria = criteria[:4]

    return {
        'diagnosis': {
            'category': category,
            'severity': severity,
            'confidence': confidence,
            'root_cause': str(diag.get('root_cause') or 'Недостатньо перевірених даних для діагнозу.'),
            'suspected_module_id': mod_id,
            'required_skills': skills,
            'user_impact': str(diag.get('user_impact') or payload.get('user_message') or ''),
            'evidence': normalized_evidence,
            'repro_steps': repro,
            'suggested_fix': str(diag.get('suggested_fix') or 'Перевірити обробку помилки у відповідному модулі.'),
            'unknowns': unknowns,
        },
        'task_draft': {
            'title': title,
            'description_md': desc_md,
            'acceptance_criteria': criteria,
        },
    }


def _call_google_gemini(api_key: str, prompt_text: str, payload: dict, output_schema: dict, timeout_sec: float):
    import httpx

    configured_gemini = os.getenv('GEMINI_MODEL', 'gemini-3.5-flash-lite')
    models = [configured_gemini] + [m for m in GEMINI_FALLBACK_MODELS if m != configured_gemini]

    user_instruction = (
        f"{prompt_text}\n\n"
        f"You MUST return a single valid JSON object matching this exact JSON Schema:\n"
        f"{json.dumps(output_schema, ensure_ascii=False)}\n\n"
        f"Input payload to analyze:\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )

    body = {
        'contents': [{'role': 'user', 'parts': [{'text': user_instruction}]}],
        'generationConfig': {
            'temperature': 0,
            'responseMimeType': 'application/json',
        },
    }

    last_exc = None
    for model_name in models:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}'
        try:
            resp = httpx.post(url, json=body, timeout=min(timeout_sec, 8.0))
            if resp.status_code == 200:
                data = resp.json()
                text_out = (
                    data.get('candidates', [{}])[0]
                    .get('content', {})
                    .get('parts', [{}])[0]
                    .get('text', '')
                    .strip()
                )
                if text_out.startswith('```'):
                    text_out = text_out.strip('`')
                    if text_out.startswith('json'):
                        text_out = text_out[4:].strip()
                parsed = json.loads(text_out)
                return _normalize_gemini_output(parsed, payload)
            if resp.status_code in (404, 429, 503):
                continue
        except httpx.TimeoutException as exc:
            last_exc = exc
            continue
        except Exception as exc:
            last_exc = exc
            continue

    if isinstance(last_exc, httpx.TimeoutException):
        raise LlmTimeout('LLM timeout') from last_exc
    if last_exc:
        raise last_exc
    return None


def call_llm(payload, output_schema):
    _load_env_files()
    configured_model = os.getenv('LLM_MODEL', 'claude-sonnet-5-5')
    prompt_text = (Path(__file__).parent / 'prompts/diagnose.md').read_text(encoding='utf-8')
    key = cache_key({
        'input': payload,
        'schema': output_schema,
        'model': configured_model,
        'prompt': prompt_text,
    })
    directory = Path(os.getenv('LLM_CACHE_DIR', str(CACHE)))
    path = directory / f'{key}.json'
    replay_mode = os.getenv('REPLAY', '1')

    if replay_mode == '1':
        if not path.exists():
            raise ReplayMiss('No cached diagnosis for these analysis inputs')
        return json.loads(path.read_text(encoding='utf-8'))['output']

    if path.exists() and os.getenv('USE_CACHE_FALLBACK', '1') == '1':
        return json.loads(path.read_text(encoding='utf-8'))['output']

    google_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
    anthropic_key = os.getenv('ANTHROPIC_API_KEY')
    provider = os.getenv('LLM_PROVIDER', '').lower()
    timeout_sec = float(os.getenv('LLM_TIMEOUT_SECONDS', '20'))

    # Якщо явно заданий ключ Google (AQ... / AIza...) і не задано anthropic_key у тестах
    if (provider == 'google' or google_key) and not anthropic_key:
        out = _call_google_gemini(google_key, prompt_text, payload, output_schema, timeout_sec)
        if out is not None:
            return out
        raise RuntimeError('Google Gemini returned no valid response')

    import anthropic
    client_kwargs = {
        'timeout': timeout_sec,
        'max_retries': 0,
    }
    if anthropic_key:
        client_kwargs['api_key'] = anthropic_key

    client = anthropic.Anthropic(**client_kwargs)
    models_to_try = [configured_model] + [m for m in FALLBACK_ANTHROPIC_MODELS if m != configured_model]

    last_error = None
    for idx, model_name in enumerate(models_to_try):
        try:
            create_kwargs = dict(
                model=model_name,
                max_tokens=4096,
                system=prompt_text,
                tools=[{
                    'name': 'report_diagnosis',
                    'description': 'Report evidence-based log diagnosis and task draft',
                    'input_schema': output_schema,
                }],
                tool_choice={'type': 'tool', 'name': 'report_diagnosis'},
                messages=[{'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}],
            )
            try:
                result = client.messages.create(**create_kwargs, temperature=0)
            except TypeError:
                result = client.messages.create(**create_kwargs, extra_body={'temperature': 0})
            output = next((b.input for b in result.content if b.type == 'tool_use' and b.name == 'report_diagnosis'), None)
            return output
        except anthropic.APITimeoutError as exc:
            raise LlmTimeout('LLM timeout') from exc
        except Exception as exc:
            last_error = exc
            exc_name = type(exc).__name__
            exc_str = str(exc).lower()
            if idx == 0 and ('notfound' in exc_name.lower() or 'not_found' in exc_str or 'model' in exc_str):
                continue
            break

    if path.exists() and os.getenv('USE_CACHE_FALLBACK', '0') == '1':
        return json.loads(path.read_text(encoding='utf-8'))['output']

    if last_error:
        raise last_error
    return None


def record(payload, schema, output):
    # Only validated and re-masked output may enter the persistent cache.
    prompt = (Path(__file__).parent / 'prompts/diagnose.md').read_text(encoding='utf-8')
    key = cache_key({
        'input': payload,
        'schema': schema,
        'model': os.getenv('LLM_MODEL', 'claude-sonnet-5-5'),
        'prompt': prompt,
    })
    directory = Path(os.getenv('LLM_CACHE_DIR', str(CACHE)))
    directory.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=directory, delete=False) as stream:
        json.dump({'output': output}, stream, ensure_ascii=False, indent=2)
        temp = Path(stream.name)
    temp.replace(directory / f'{key}.json')
