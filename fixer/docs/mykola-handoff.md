# Готова частина Миколи
## Реалізовано
- JPA entities/repositories: incidents, dev_tasks, developers, audit_logs, settings.
- YAML seed developers/modules, читання 5 demo logs/complaints; reset.
- Порти data/port/, admission dedup, точне збереження логів і SHA-256.
- TaskStore.dispatch з DB lock, unique keys, atomic audit, occurrences, новий task після DONE.
- Inbox query, ACK/DONE, in-app delivery, optional webhook, Markdown export.
- Реальні метрики, включно з відокремленням manual від auto.
- Інтеграційні тести H2 і локального webhook.

## Славікові
Прибрати ScaffoldController/read-fixtures, підключити сервіси до своїх REST controllers. Детальна послідовність і семантика — backend/src/main/java/fixer/data/README.md.
Не ставити AUTO_DISPATCHED через updateStatus до dispatch; taskStore.dispatch сам ставить фінальний статус. Для manual передати actor=HUMAN та outcome=AUTO_DISPATCHED, бо окремого DISPATCHED у погодженому enum немає.
DataException → API exception handler з status()/code().
TaskSink викликати тільки після commit і лише коли DispatchResult.created=true. Не відправляти webhook для dedup/repeated confirm.
Task body формується у pipeline з маскованих даних. Метадані incident/backup/occurrences додає data view.

## Перевірка
З backend/: `mvn test` (Java 17). Звичайні pipeline/router/policy placeholder-тести інших учасників досі Disabled — їх мають замінити власники.
