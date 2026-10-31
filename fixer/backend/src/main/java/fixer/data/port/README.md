# Межа Java модулів
Ці інтерфейси — погоджена у скелеті межа. Реалізації додає Микола як Spring beans. Славік інжектує порти, без залежності від JPA entities.
JsonNode у find/saveAnalysis — тимчасова типізація payload за contracts/, не довільний новий формат. Внутрішні JPA поля не віддавати напряму в API. task/incident id — long, developer id — String.
TaskStore.dispatch — транзакційна операція з in-app persistence й audit. TaskSink — доставка вже створеного task після commit. LogStorage — окремий інтерфейс fixer.data.LogStorage.
Додаткові query-методи можна розширювати additive PR, не змінюючи існуючі сигнатури.
