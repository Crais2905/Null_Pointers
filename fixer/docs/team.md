# Хто що робить за новим ТЗ
| Учасник | Папки | Перша задача |
|---|---|---|
| Олег | web/, docs/ | Зібрати екран інциденту з mocks; далі Inbox, Team, polling |
| Микола | backend/.../data, dispatch, metrics; resources/seed | JPA і repo для incidents/dev_tasks/developers/audit_logs/settings, DataSeeder, LogStorage, TaskSink adapters, Markdown, реальні метрики |
| В’ячеслав | backend/.../api, pipeline, evidence, routing, policy, ai, audit; Java tests | DTO, EvidenceVerifier, Router, R1–R6, fingerprint, дедуп, IncidentPipeline, AiClient |
| Святослав | ai/ | Маскування PII, parser, D1–D7, evidence pack, diagnose, replay, pytest |

## Перші спільні домовленості
1. Микола + Славік: погодити JPA/repository API, TaskSink, LogStorage; хто і в якій транзакції створює dev_task й audit.
2. Святослав + Славік: contracts/ai-analyze-log.*; snake_case усередині, camelCase назовні.
3. Олег + Славік: rawLog у GET incident додано для LogViewer; logLines залишається числом. RawLog не відправляти зовнішнім webhook; для доставки використовувати масковані докази.
4. Зміни contracts/ через малий PR із повідомленням усім.

## Межі й критерії
- Микола: БД + seed + доставка + metrics; без скорингу й промптів. Webhook помилка не відкочує Inbox, реальну відправку реалізувати окремо.
- Славік: Java вибирає людину, перевіряє цитати по оригінальних рядках, обмежує confidence і виконує R1–R6 у правильному порядку.
- Святослав: LLM лише один виклик для діагнозу; ніколи не обирає дева; до LLM усі PII маскуються. Масковані цитати й перевірку по raw погодити зі Славіком, щоб PII не ламали evidence.
- Олег: фронт ходить лише в Java, мок-режим незалежний; фінальні статуси припиняють polling.

Невирішена деталь ТЗ: UNIQUE TASK:{fingerprint} назавжди конфліктує з можливістю нового завдання після DONE. Перш ніж реалізувати, погодити lifecycle: чи reopening існуючого, чи окремий ключ для нового покоління. У скелеті поведінка не вигадана.
Тести-заглушки позначено skipped/disabled; це не готові перевірки продукту.
