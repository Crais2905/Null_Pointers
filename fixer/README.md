# Fixer · AI-тріаж логів
Скелет за новим ТЗ: React :5173 → Java 17 / Spring Boot / H2 :8080 → Python 3.11 / FastAPI :8000. Старі refund, Yummi та емоції не використовуються.

## Почати на Windows
Передумови: Java 17, Maven 3.9+, Python 3.11+, Node.js 20.19+ з npm у PATH.
```powershell
cd D:\hack1\fixer
./scripts/dev.ps1 setup
./scripts/dev.ps1 up
```
Setup ставить залежності та копіює env-приклади. Ключ Claude для скелета не потрібен.
Web http://localhost:5173 · Java http://localhost:8080/api/health · AI http://localhost:8000/health · OpenAPI http://localhost:8000/docs.
Ctrl+C зупиняє launcher. Для окремої роботи запускайте потрібний сервіс у своєму терміналі:
```powershell
cd web
npm run dev
```
```powershell
cd backend
mvn spring-boot:run
```
```powershell
cd ai
.venv/Scripts/python -m uvicorn app.main:app --port 8000 --reload
```
Для Linux/macOS: venv через python3.11, pip install -r requirements.txt, npm install; запускайте аналогічно з .venv/bin/python.

## Docker
`cp .env.example .env`, потім `docker compose up --build` або `make up`.
AI кеш тепер усередині ai/, тому образ не залежить від contracts/ поза build context.

## Що працює
- Web: три стартові екрани; VITE_USE_MOCKS=true за замовчуванням, можна працювати без бекенду.
- Java: health, read-stubs incidents/tasks/developers/modules/settings/metrics, Markdown фікстури. Це демо-дані, а не відправлене завдання.
- AI: валідація запиту/відповіді та точний replay DUP_CHARGE (incident_id може змінюватись). Інші вхідні дані → 501.
- П’ять demo logs по 60 рядків, синхронізація AI fixtures, перевірка реальних цитат у контракті.

## Що команда реалізує
БД/JPA, сідер, parser/masking/detectors/LLM, routing/evidence/policy/pipeline, dedup, dispatch, реальні metrics, UI-компоненти. Write endpoints поки 501, щоб не імітувати успішну роботу. Лише DUP_CHARGE має синтетичний replay; інші очікувані результати описані в ТЗ й потребують реалізації.
Модель у .env.example взята з ТЗ; її доступність треба перевірити під час підключення реального провайдера.
Ролі й перші кроки: docs/team.md. Спільні payload: contracts/README.md. Рішення для інтеграції зафіксовано в contracts/DECISIONS.md; Java interfaces у data/port/. Починайте реалізацію за ними.

## Перевірки
`./scripts/dev.ps1 test` — перевірка scaffold, Maven, pytest, TypeScript + Vite build.
`python scripts/check_scaffold.py` — без зовнішніх залежностей: JSON, Python syntax, evidence, replay, однакові seed logs.
`./scripts/dev.ps1 seed` — синхронізує логи; це не reset БД. API reset реалізує команда.
Java і Python бізнес-тести-заглушки явно disabled/skipped. Реальні початкові Python тести перевіряють схеми, межі confidence, точне replay.

## Git
Git-корінь — D:\hack1, код — fixer/. Кожен створює свою feature-гілку від свіжого main; PR у main.
Гілки: feature/frontend, feature/data-dispatch, feature/pipeline-api, feature/ai-engine.
CODEOWNERS — шаблон без реальних handles: заповніть після узгодження GitHub-імен.
