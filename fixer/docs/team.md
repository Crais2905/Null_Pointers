# Хто що робить за новим ТЗ
| Учасник | Папки | Перша задача |
|---|---|---|
| Олег | web/, docs/ | Зібрати екран інциденту з mocks; далі Inbox, Team, polling |
| Микола | backend/.../data, dispatch, metrics; resources/seed | JPA і repo для incidents/dev_tasks/developers/audit_logs/settings, DataSeeder, LogStorage, TaskSink adapters, Markdown, реальні метрики |
| В’ячеслав | backend/.../api, pipeline, evidence, routing, policy, ai, audit; Java tests | DTO, EvidenceVerifier, Router, R1–R6, fingerprint, дедуп, IncidentPipeline, AiClient |
| Святослав | ai/ | Маскування PII, parser, D1–D7, evidence pack, diagnose, replay, pytest |

## Спільні рішення вже зафіксовані
Читайте contracts/DECISIONS.md і backend/src/main/java/fixer/data/port/README.md перед початком. Додаткове погодження для старту не потрібне.

- Микола реалізує порти data/port/, JPA/repos, seed, LogStorage, TaskStore.dispatch, TaskSink adapters та metrics.
- Славік використовує ці порти, реалізує API/DTO, pipeline, evidence, routing, policy, AiClient й audit orchestration.
- Святослав реалізує AI за schemas.py; evidence.verification_quote додає локально після LLM, ніколи не передає в LLM.
- Олег працює на mocks; реалізує UI за contracts/ і переключає VITE_USE_MOCKS=false для інтеграції.

Нестиковки ТЗ щодо повторного task після DONE, атомарності dispatch, PII evidence й форматів API вирішені в DECISIONS.md. Зміни спільних контрактів надалі робити additive через PR.
Тести-заглушки disabled/skipped: це не реалізація продуктових перевірок.
