# Карта проєкту

Git-корінь D:\hack1. В IntelliJ відкривати кореневий pom.xml як Maven project.

```text
hack1/
├── pom.xml                  Maven workspace; включає fixer/backend
├── mvnw, mvnw.cmd, .mvn/    Maven Wrapper
├── .run/                    спільна конфігурація запуску IntelliJ
├── run-backend.ps1          запуск backend або тестів
└── fixer/
    ├── backend/             Java / Spring Boot
    │   └── src/
    │       ├── main/java/fixer/
    │       │   ├── data/
    │       │   │   ├── domain/  JPA entities
    │       │   │   ├── repo/    Spring Data repositories
    │       │   │   ├── port/    інтерфейси для підключення Славіка
    │       │   │   ├── seed/    DataSeeder, SeedCatalog
    │       │   │   └── *.java  реалізації Jpa*Store та допоміжні класи
    │       │   ├── dispatch/   Inbox adapter, webhook, Markdown
    │       │   ├── metrics/    фактичні метрики з БД
    │       │   ├── api/        REST controllers
    │       │   ├── pipeline/   оркестрація
    │       │   ├── evidence/   перевірка цитат і confidence
    │       │   ├── routing/    вибір виконавця
    │       │   ├── policy/     правила відправки та fingerprint
    │       │   ├── ai/         Java-клієнт Python AI
    │       │   └── audit/      оркестрація audit
    │       ├── main/resources/
    │       │   ├── seed/       developers.yml, catalog.yml, complaints.json, logs/
    │       │   └── fixtures/   стартові API-фікстури
    │       └── test/java/fixer/
    │           ├── data/      тести даних та доставки
    │           └── *Test.java тести інших модулів
    ├── ai/                  Python / FastAPI — Святослав
    ├── web/                 React — Олег
    ├── contracts/           спільні JSON та рішення інтеграції
    ├── docs/                інструкції, розподіл роботи, handoff
    └── scripts/             запуск, перевірки, пакування
```

## Твоя зона — Микола
`backend/src/main/java/fixer/data/`, `dispatch/`, `metrics/`, ресурси `seed/`, тести `test/java/fixer/data/`.
Починати навігацію з `data/port/`: це публічна межа між даними й пайплайном. Реалізації Jpa*Store залишаються у data/, щоб не міняти пакети та імпорти перед інтеграцією.

## Службові папки
`.build/`, `target/`, `node_modules/`, `.venv/` — локальні кеші та результати збірки. Git їх ігнорує. У IntelliJ можна позначити через Mark Directory as → Excluded, якщо вони заважають у дереві. Не переносити туди код або контракти.

## Інструкції
- `docs/intellij.md` — Maven, JDK та запуск.
- `docs/mykola-handoff.md` — що підключає Славік.
- `docs/team.md` — хто за що відповідає.
- `contracts/DECISIONS.md` — правила API й спільних інтерфейсів.
