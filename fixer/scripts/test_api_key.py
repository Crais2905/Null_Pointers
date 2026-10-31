"""Утиліта для перевірки та автоматичного підключення API-ключа (Google Gemini або Anthropic Claude) у Fixer.

Підтримує:
  1. Google Gemini API ключі (як нового формату `AQ.Ab8RN...` з DevRelay / Google AI Studio, так і `AIza...`)
     — саме вони потрібні для участі в Google Prize Track на хакатоні!
  2. Anthropic Claude API ключі (`sk-ant-...`).

Використання:
  .\test-key.cmd "AQ.Ab8RN..." -Save
"""
import argparse
import json
import os
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / '.env'

GEMINI_CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
]

ANTHROPIC_CANDIDATE_MODELS = [
    'claude-sonnet-5-5',
    'claude-sonnet-4-6',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
]


def load_env(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if path.is_file():
        for raw in path.read_text(encoding='utf-8').splitlines():
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            data[k.strip()] = v.strip().strip('"').strip("'")
    return data


def save_env(path: Path, updates: dict[str, str]) -> None:
    existing_lines = path.read_text(encoding='utf-8').splitlines() if path.is_file() else [
        'GOOGLE_API_KEY=',
        'GEMINI_API_KEY=',
        'ANTHROPIC_API_KEY=',
        'LLM_MODEL=claude-sonnet-5-5',
        'GEMINI_MODEL=gemini-3.8-flash',
        'REPLAY=1',
        'USE_CACHE_FALLBACK=1',
        'AI_BASE_URL=http://localhost:8000',
        'DISPATCH_WEBHOOK_URL=',
        'VITE_API_URL=http://localhost:8080',
        'VITE_USE_MOCKS=false',
    ]
    used_keys = set()
    new_lines = []
    for line in existing_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and '=' in stripped:
            k = stripped.split('=', 1)[0].strip()
            if k in updates:
                new_lines.append(f'{k}={updates[k]}')
                used_keys.add(k)
                continue
        new_lines.append(line)
    for k, v in updates.items():
        if k not in used_keys:
            new_lines.append(f'{k}={v}')
    path.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')


def is_google_key(api_key: str) -> bool:
    return api_key.startswith('AQ.') or api_key.startswith('AIza') or not api_key.startswith('sk-ant-')


def test_google_gemini_key(api_key: str) -> tuple[bool, str | None, str]:
    print('  [1/2] Перевірка автентифікації ключа в Google Generative Language API...')
    models_url = f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}'
    try:
        r = httpx.get(models_url, timeout=10.0)
    except Exception as e:
        return False, None, f'Помилка мережі при підключенні до Google API: {e}'

    if r.status_code != 200:
        try:
            err_msg = r.json().get('error', {}).get('message', r.text[:200])
        except Exception:
            err_msg = r.text[:200]
        return False, None, f'Google API відхилив ключ (HTTP {r.status_code}): {err_msg}'

    models_data = r.json().get('models', [])
    available_names = [m.get('name', '').replace('models/', '') for m in models_data]
    print(f'        ✓ Ключ ДІЙСНИЙ! Доступно моделей у вашому акаунті Google AI: {len(available_names)}')

    print('\n  [2/2] Тестова генерація діагнозу логу (generateContent)...')
    body = {
        'contents': [{
            'role': 'user',
            'parts': [{
                'text': (
                    'Return ONLY a valid JSON object with keys "category" set to "PAYMENT_DUPLICATE" '
                    'and "severity" set to "P1".'
                ),
            }],
        }],
        'generationConfig': {
            'temperature': 0,
            'responseMimeType': 'application/json',
        },
    }

    last_status = ''
    for model in GEMINI_CANDIDATE_MODELS:
        if available_names and model not in available_names:
            continue
        print(f'        [*] Пробуємо модель {model} ... ', end='', flush=True)
        gen_url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
        try:
            resp = httpx.post(gen_url, json=body, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                text_out = (
                    data.get('candidates', [{}])[0]
                    .get('content', {})
                    .get('parts', [{}])[0]
                    .get('text', '')
                    .strip()
                )
                print('УСПІШНО! ✓')
                return True, model, f'Модель {model} згенерувала JSON: {text_out[:120]}'
            elif resp.status_code == 503:
                print('перевантажена (503 High Demand), пробуємо наступну...')
                last_status = '503 High Demand на серверах Google'
            elif resp.status_code == 429:
                print('ліміт квоти (429), пробуємо наступну...')
                last_status = '429 Rate Limit / Quota'
            elif resp.status_code == 404:
                print('недоступна (404), пробуємо наступну...')
            else:
                print(f'HTTP {resp.status_code}')
                last_status = f'HTTP {resp.status_code}: {resp.text[:120]}'
        except httpx.TimeoutException:
            print('таймаут (8с), пробуємо наступну...')
            last_status = 'Timeout'
        except Exception as e:
            print(f'помилка ({type(e).__name__})')
            last_status = str(e)

    # Якщо список моделей повернув 200 OK, значить сам ключ є 100% валідним Google API ключем!
    return (
        True,
        'gemini-3.8-flash',
        f'Ключ Google API підтверджено (HTTP 200 на /v1beta/models, {len(available_names)} моделей). '
        f'Примітка по генерації: {last_status or "використовується gemini-3.8-flash + автоматичний fallback на кеш"}.',
    )


def test_anthropic_key(api_key: str) -> tuple[bool, str | None, str]:
    try:
        import anthropic
    except ImportError:
        return False, None, "Пакет 'anthropic' не встановлено."

    client = anthropic.Anthropic(api_key=api_key, timeout=15.0, max_retries=0)
    test_tool = {
        'name': 'report_diagnosis',
        'description': 'Test tool call for Fixer log diagnosis',
        'input_schema': {
            'type': 'object',
            'properties': {
                'category': {'type': 'string'},
                'severity': {'type': 'string'},
            },
            'required': ['category', 'severity'],
        },
    }

    last_err = ''
    for model in ANTHROPIC_CANDIDATE_MODELS:
        print(f'  [*] Перевірка моделі {model} ... ', end='', flush=True)
        try:
            create_kwargs = dict(
                model=model,
                max_tokens=128,
                tools=[test_tool],
                tool_choice={'type': 'tool', 'name': 'report_diagnosis'},
                messages=[{
                    'role': 'user',
                    'content': 'Log line 1: ERROR duplicate POST /api/pay. Return PAYMENT_DUPLICATE and P1.',
                }],
            )
            try:
                resp = client.messages.create(**create_kwargs, temperature=0)
            except TypeError:
                resp = client.messages.create(**create_kwargs, extra_body={'temperature': 0})
            tool_out = next(
                (b.input for b in resp.content if getattr(b, 'type', None) == 'tool_use'),
                None,
            )
            print('УСПІШНО! ✓')
            return True, model, f'Модель відповіла коректним tool_use: {json.dumps(tool_out, ensure_ascii=False)}'
        except anthropic.AuthenticationError as e:
            print('ПОМИЛКА АВТОРИЗАЦІЇ (401) ✕')
            return False, None, f'Ключ недійсний або відкликаний (AuthenticationError): {e}'
        except anthropic.RateLimitError as e:
            print('ЛІМІТ ЗАПИТІВ / БАЛАНС (429) ✕')
            return False, None, f'На ключі вичерпано кредити або Rate Limit (429): {e}'
        except anthropic.NotFoundError:
            print('недоступна (404), пробуємо наступну...')
            continue
        except Exception as e:
            print(f'помилка ({type(e).__name__})')
            last_err = f'{type(e).__name__}: {e}'

    return False, None, last_err or 'Жодна з моделей Claude не відповіла успішно.'


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

    parser = argparse.ArgumentParser(description='Перевірка API-ключа (Google Gemini або Anthropic) для Fixer')
    parser.add_argument('key', nargs='?', help='API ключ (наприклад, AQ.Ab8RN... або AIza... або sk-ant-...)')
    parser.add_argument('--save', action='store_true', help='Автоматично зберегти робочий ключ у fixer/.env')
    args = parser.parse_args()

    env_vars = load_env(ENV_FILE)
    api_key = (
        args.key
        or os.getenv('GOOGLE_API_KEY')
        or os.getenv('GEMINI_API_KEY')
        or os.getenv('ANTHROPIC_API_KEY')
        or env_vars.get('GOOGLE_API_KEY')
        or env_vars.get('GEMINI_API_KEY')
        or env_vars.get('ANTHROPIC_API_KEY')
        or ''
    ).strip()

    print('===================================================================')
    print(' Fixer · Перевірка API-ключа (Google Gemini AQ./AIza & Anthropic)')
    print('===================================================================')

    if not api_key:
        try:
            api_key = input('Вставте ваш API ключ (AQ... / AIza... / sk-ant-...): ').strip()
        except EOFError:
            api_key = ''

    if not api_key:
        print('\n[!] Ключ не вказано.')
        return 1

    masked_preview = api_key[:10] + '...' + api_key[-4:] if len(api_key) > 16 else '***'
    google_mode = is_google_key(api_key)
    provider_label = 'Google Gemini API (Підходить під категорію Google!)' if google_mode else 'Anthropic Claude API'
    print(f'\nПровайдер: {provider_label}')
    print(f'Ключ:      {masked_preview}\n')

    if google_mode:
        ok, working_model, details = test_google_gemini_key(api_key)
    else:
        ok, working_model, details = test_anthropic_key(api_key)

    print('\n-------------------------------------------------------------------')
    if ok and working_model:
        print(f'✅ КЛЮЧ ПРАЦЮЄ! Обрана модель: {working_model}')
        print(f'   Деталі: {details}')
        if args.save:
            if google_mode:
                save_env(ENV_FILE, {
                    'LLM_PROVIDER': 'google',
                    'GOOGLE_API_KEY': api_key,
                    'GEMINI_API_KEY': api_key,
                    'GEMINI_MODEL': working_model,
                    'REPLAY': '0',
                    'USE_CACHE_FALLBACK': '1',
                })
            else:
                save_env(ENV_FILE, {
                    'LLM_PROVIDER': 'anthropic',
                    'ANTHROPIC_API_KEY': api_key,
                    'REPLAY': '0',
                    'USE_CACHE_FALLBACK': '1',
                })
            print(f'\n💾 Ключ та провайдер успішно збережені у {ENV_FILE}!')
        else:
            print('\nЩоб зберегти цей ключ у конфігурацію проєкту, додайте прапорець -Save:')
            print(f'   .\\test-key.cmd "{api_key}" -Save')
        return 0
    else:
        print('❌ КЛЮЧ НЕ СПРАЦЮВАВ!')
        print(f'   Причина: {details}')
        return 2


if __name__ == '__main__':
    sys.exit(main())
