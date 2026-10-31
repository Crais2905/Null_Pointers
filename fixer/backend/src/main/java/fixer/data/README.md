# Дані та інтеграція зі Славіком
Реалізації готові: JpaIncidentStore, JpaTaskStore, JpaDeveloperDirectory, JpaSettingsStore, JpaAuditStore, JpaLogStorage; всі зареєстровані як Spring beans.
Схема створюється Hibernate/H2 при старті. DataSeeder завантажує 4 developer records, каталог і сценарії з YAML/JSON/resources, не створює фейкових incidents/tasks.
Порти у data/port/ — основний інтерфейс. Додано list/saveStages до IncidentStore, list/setStatus до TaskStore без зміни попередніх сигнатур.
DataException має status()/code(): API layer має віддати {code,message} та відповідний HTTP status. Контролери й AI pipeline залишаються зоною Славіка; ScaffoldController ще показує fixtures.

## Послідовність інтеграції
1. incidentStore.accept(Submission) у POST; якщо reused=true, не запускати пайплайн вдруге.
2. incidentStore.updateStatus(id,"ANALYZING",null); передати logs.read(id) у AI.
3. Після Java verification/routing/policy: saveAnalysis(id, aiResponse, verifiedDiagnosisCamelCase, finalConfidence, fingerprint, candidates, decision, measuredPipelineMs). Він встановлює DIAGNOSED і записує audit. Перший DTO — snake_case AI, verifiedDiagnosis — зовнішній camelCase.
4. saveStages(id, array) оновлює прогрес. recordPipelineDuration(id, measuredMs) викликати після завершення всього прогону (зокрема dispatch), щоб metrics враховували повний фактичний час. Підготувати фінальний task body з маскованих цитат, ніколи не додавати verification_quote. Самі порти не верифікують діагноз і не обирають виконавця.
5. Для очікування: updateStatus(PENDING_CONFIRM/NEEDS_TRIAGE). Для dispatch: taskStore.dispatch(DispatchRequest). outcome=AUTO_DISPATCHED для обох успішних шляхів, actor=SYSTEM для автоматичного і HUMAN для ручного. Це термінальний статус успішної доставки за наявним enum; метрики відрізняють actor, не зараховують manual як auto.
6. dispatch викликати БЕЗ зовнішньої довгої транзакції; його Spring-транзакція атомарно створює/об’єднує task, audit та зв’язок incident. Потім, лише result.created()==true, викликати TaskSink.deliver(taskId) поза транзакцією. @Primary адаптер WebhookSink сам повертає IN_APP, якщо webhook URL порожній.
7. Використати tasks.list(assigneeId), tasks.setStatus(id,"ACK"/"DONE"), MarkdownExporter.export(id), MetricsService.snapshot(), incidentStore.resetDemo().

## Гарантії
Admission дубль — SHA-256 UTF-8 log + точний message за 10 хв. CRLF та сирий текст не змінюються. max raw 10 MiB; parser/truncation — зона Python.
Всі write операції блокують рядок dispatch-lock БД. Різні incidents одного бага отримують один open task; той самий incident не збільшує occurrences повторно. DONE звільняє activeFingerprint, нове завдання отримує новий idempotency key.
Відкриті задачі — OPEN/ACK. У views bodyMd автоматично додаються incident link, актуальний occurrences і backup. RawLog та verification_quote не потрапляють у webhook. Webhook відправляє Slack-сумісний текст із task id, priority, assignee й шляхом Markdown; довільний AI prose назовні не відправляється.
Webhook має connect/request timeout, без retry; DB claim гарантує максимум одну спробу. За падіння процесу після claim до відповіді повторна доставка не відбувається; це свідоме at-most-once обмеження MVP. Доставка не має exactly-once гарантії на стороні зовнішнього сервісу.
Reset стирає tasks/incidents/audit, відновлює developers і autoDispatch=true; не скидає identity counters і не викликає AI/webhook. Не покладатись на фіксовані incident/task IDs.
