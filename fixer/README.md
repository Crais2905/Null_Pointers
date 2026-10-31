# Fixer · AI-тріаж логів із Gemini
React :5173 → Java 17+/Spring Boot/H2 :8080 → Python 3.11+/FastAPI/Gemini :8000.

## Запустити все
З Git-кореня D:\hack1: **start.cmd** або `./start.ps1`.
Усередині fixer/: `./scripts/dev.ps1 up` викликає той самий лаунчер.
Перший запуск підготує залежності; ключ Gemini вставляється тільки в **fixer/.env**, поле GEMINI_API_KEY. REPLAY=auto обирає live за наявності ключа, інакше replay. Для стабільного офлайн-демо запускати `../start.ps1 -Replay`.
На фронтенді обрано Java API, а не браузерні моки. Моки можна обрати перемикачем для окремої роботи над UI.

## Gemini
LLM_MODEL=gemini-3.5-flash-lite (можна змінити на доступну Gemini-модель). LLM_TIMEOUT_SECONDS=20. RECORD=1 записує лише валідовані масковані відповіді; REPLAY=0 примусово викликає Gemini, а без ключа повертає зрозумілу помилку.
JSON-контракти не змінено. Розробника вибирає Java, не LLM. Сирі логи та verification_quote не потрапляють у Gemini: Python передає тільки масковані evidence pack/summary/findings і каталог.
Демо-кеш синтетичний, не запис живого Gemini. При зміні prompt/schema/model/catalog його треба перебудувати: `ai/.venv/Scripts/python ai/scripts/build_demo_cache.py`.

## Перевірка
`../start.ps1 -Test` запускає Java/AI tests і frontend build. Відомі startup-проблеми усунено: Java AI client примусово HTTP/1.1, Uvicorn запускається з --http h11.
Демо: DUP_CHARGE → DUP_CHARGE_AGAIN (одне завдання, occurrences=2); PROMO_NPE; COURIER_TIMEOUT; AMBIGUOUS → triage. Settings autoDispatch=false → confirm; Inbox підтримує ACK/DONE та Markdown.

## Docker
З fixer/: скопіювати .env.example в .env (якщо ще немає), заповнити GEMINI_API_KEY або залишити порожнім для replay, `docker compose up --build`. Docker не потрібен для Windows start.cmd.

## Команда
Олег — web/docs; Микола — data/dispatch/metrics/seed; В’ячеслав — REST/pipeline/evidence/routing/policy; Святослав — Python AI.
Деталі: docs/team.md, docs/structure.md, contracts/DECISIONS.md.
