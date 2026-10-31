# Gemini AI Engine
Python 3.11+, FastAPI, Google Gen AI SDK. Без БД і вибору виконавця.

## З усією системою
У Git-корені запустити start.cmd. Конфігурація — fixer/.env, ключ — GEMINI_API_KEY. Лаунчер завантажує .env; при окремому запуску uvicorn також вкажіть --env-file ../.env.
```powershell
cd D:\hack1\fixer\ai
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --http h11 --env-file ../.env
```

## Режими
- REPLAY=auto: ключ є → Gemini; ключа немає → офлайн-кеш.
- REPLAY=1: тільки cache; відсутній запис → 503, live автоматично не викликається.
- REPLAY=0: живий Gemini; GEMINI_API_KEY обов’язковий.
- LLM_MODEL=gemini-3.5-flash-lite; LLM_TIMEOUT_SECONDS=20; RECORD=1 для запису валідованих маскованих відповідей.

Gemini викликається через google-genai, generate_content із response_json_schema, JSON MIME, temperature=0; SDK retry вимкнено (одна спроба), після помилки валідації є один повтор у diagnose.py. Timeout → 504, помилка ключа/квоти/провайдера → 503 з безпечним повідомленням. Java має один transport retry.
JSON-контракт Java→Python незмінний. Gemini не отримує сирий лог, імен розробників або verification_quote. Вихід проходить Pydantic, повторне маскування й перевірку цитат. verification_quote відновлюється локально.

## Кеш
Ключ включає provider=gemini, model, prompt, schema та масковані input. П’ять сценаріїв і контрактний запит мають синтетичні curated fixtures; це не твердження про виклики живого Gemini. Зміна моделі чи prompt потребує нового кешу.
`python scripts/build_demo_cache.py` перебудовує демо без LLM. Джерело логів — backend/src/main/resources/seed/logs; синхронізація — scripts/sync_fixtures.py з кореня fixer.

## Тести
З ai/: `.venv/Scripts/python -m pytest -q`; усі provider-виклики замокані, реальний ключ не потрібен. SDK, schema, timeout, quota, masking, parser, detectors, evidence та replay перевіряються окремо.

Лаунчер у replay/test використовує REPLAY_MODEL (за замовчуванням gemini-3.8-flash для готових фікстур), незалежно від поточної живої LLM_MODEL. Це дозволяє запускати демо після зміни live-моделі.
