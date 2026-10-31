# Зафіксовані рішення для реалізації
Це базові рішення скелета за дорученням Миколи. Усі четверо реалізують модулі відповідно до них; вони не означають, що продуктова логіка вже готова.

## Власники спільних файлів
Микола володіє data/, dispatch/, metrics/, ресурсами seed, JPA та Spring Data repositories. Славік використовує data/port/IncidentStore, TaskStore, DeveloperDirectory, SettingsStore, AuditStore; реалізації портів робить Микола. Славік не додає паралельні сутності чи репозиторії.
Контролери, зовнішні DTO й AI-клієнт робить Славік. Олег використовує contracts/ та api/client.ts. Python schemas.py — Святослав. Тести кожного модуля пише його автор.

## Стани й API
POST incidents (JSON або multipart: поля userMessage, orderId, userId, complaintAt; файл file) → 202 {id,status}; simulate → та сама відповідь. Пайплайн запускається після збереження NEW, поза HTTP-потоком.
GET incidents → короткі картки {id,status,title,severity,assignee,createdAt}; assignee — {id,name} або null; title/severity — null до діагнозу.
GET incident → contracts/api-incident.json; rawLog — оригінальний текст лише для внутрішнього UI, logLines — кількість. Порожні diagnosis, decision, task і confidence → null; stages/findings/candidates/auditLog → [].
Confirm/dismiss → повний incident. Confirm дозволений лише PENDING_CONFIRM або NEEDS_TRIAGE; у NEEDS_TRIAGE assigneeId обов’язковий. Невідомий developer → 404, недоступний → 409. Повторний confirm вже відправленого повертає поточний incident без повторної доставки. Dismiss не дозволений після dispatch/dedup → 409.
GET tasks → масив api-task із status OPEN/ACK/DONE. PATCH приймає тільки ACK або DONE; DONE термінальний (повторний DONE ідемпотентний, DONE→ACK = 409).
GET/PUT settings → {autoDispatch:boolean}; PUT замінює прапорець. GET modules і developers → масиви. Назовні ownedModules, у YAML owned_modules.
Reset → 204, стирає інциденти/завдання/audit, відновлює seed і autoDispatch=true. Не запускає аналіз. GET tasks/{id}.md → text/markdown UTF-8.
Помилки → {code,message}; 400 — неправильний запит, 404 — немає запису, 409 — конфлікт стану; 501 — тільки для стартових заглушок. Помилка AI після одного retry → incident FAILED, причина у error, UI не падає.

## Транзакції, повтори й доставка
Микола реалізує TaskStore.dispatch атомарно: заблокувати incident, перевірити вже наявний taskId, знайти активне завдання за fingerprint, створити/об’єднати task, зв’язати incident, записати audit. Повтор для того самого incident не збільшує occurrences. Новий incident того самого бага збільшує occurrences рівно один раз.
Славік викликає dispatch лише після evidence/routing/policy. Його попередня перевірка dedup не замінює повторну перевірку під блокуванням у TaskStore.
Fingerprint = lowercase hex SHA-1 від UTF-8 signature, без додаткової LLM-нормалізації Java.
Рішення суперечності UNIQUE: історичний fingerprint зберігається завжди; окрема nullable activeFingerprint UNIQUE містить fingerprint тільки для OPEN/ACK, для DONE — null. Для першого завдання key=TASK:{fingerprint}, наступні після DONE — TASK:{fingerprint}:{incidentId}. Це дозволяє новий випадок після закриття й зберігає ідемпотентність.
Для серіалізації конкурентних створень у H2 застосувати один DB lock на рядку settings key=dispatch-lock через PESSIMISTIC_WRITE. Для MVP допустиме загальне блокування; не використовувати лише synchronized.
In-app — успішна транзакція БД, не мережевий виклик. TaskSink.deliver(Long) викликається після commit тільки для нового завдання; адаптер не створює другий dev_task. Збережена сигнатура повертає IN_APP/WEBHOOK_OK/WEBHOOK_FAILED. DeliveryResult — внутрішня деталізація помилки, не новий обов’язковий інтерфейс.
Webhook опціональний, один виклик із timeout, без автоматичного retry; помилка не відкочує task, пише WEBHOOK_FAILED і audit. Reset або confirm не викликають webhook повторно для старого task.

## Докази й PII
Python до LLM маскує PII та зберігає номери рядків. Для кожної цитати додає evidence.verification_quote: точний фрагмент оригінального рядка (до 200 символів) з локального відображення маскування, а quote лишається маскованою цитатою LLM. LLM ніколи не отримує verification_quote.
Java перевіряє verification_quote як substring raw рядка з тим самим номером. Відсутня/хибна цитата відкидається. verification_quote не копіюється в зовнішній API, audit payload, task, Markdown або webhook. API evidence містить тільки line, quote, why, verified.
0 валідних доказів → triage; 1 → confidence cap 0.7; null/невідомий module → cap 0.5. LLM confidence зберігається окремо. Невідомий module нормалізується в null.
Порожній/невідомий signature не дедуплікується; UNKNOWN не створює автоматичного завдання. Ручне призначення для такого incident використовує signature manual_incident:{id}, із брифом і явною позначкою, що діагноз непідтверджений.

## Логи й метрики
LogStorage.save повертає SHA-256 UTF-8 оригінального тексту (lowercase hex), read повертає той самий текст; не міняє CRLF чи нумерацію. 5 MiB/20000 рядків — ліміт аналізованого префікса, оригінал зберігається; Python повертає truncated=true. Upload .log/.txt/.json читається як UTF-8; помилка декодування → 400.
Transport upload limit 10 MiB → 413; від 5 до 10 MiB аналізується префікс до 5 MiB з попередженням, без розриву UTF-8 символу. Кількість analyzed lines у parsed.lines_total; UI logLines — оригінальна кількість.
Admission dedup: однаковий log_hash + точний userMessage за останні 10 хв → наявний incident, без нового прогону.
avgPipelineSec — середнє pipeline_ms серед завершених прогонів з виміряним часом; total — усі incidents; autoDispatchedPercent = AUTO_DISPATCHED / total * 100; dedupMerged — кількість DEDUPLICATED incidents. При total=0 значення 0. Фікстурні таймінги не є вимірюваннями.
