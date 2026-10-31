# Спільні контракти
JSON — приклади, не JSON Schema. Pydantic-моделі у ai/app/schemas.py, TypeScript у web/src/api/types.ts; Java DTO реалізує Славік.
AI snake_case, зовнішній API camelCase. Детектори findings зберігають line_numbers як у ТЗ. Номери рядків починаються з 1.
GET incident додатково повертає rawLog (string), оскільки logLines у ТЗ — кількість, а UI потребує сам текст. PII не показувати у зовнішніх адаптерах.
GET developers: API використовує ownedModules, YAML seed — owned_modules. Read-stub перетворює назву.
POST create → 202 {id,status}; confirm/dismiss → повний incident (домовленість скелета).
POST simulate → 202 {id,status}; reset → 204. Наразі write-stubs повертають 501 {code,message}, бо пайплайн не реалізовано.
PATCH task → повний task; GET tasks → масив; GET modules → масив об’єктів каталогу.
GET tasks/{id}.md → text/markdown, не JSON.
Gemini replay має п’ять демо-запитів і контрактний запит; incident_id не впливає на ключ. Незнайомий payload → 503, без прихованого live-виклику. Кеш синтетичний, не запис реального Gemini.


Остаточні правила інтеграції: DECISIONS.md (має пріоритет для уточнень). Java ports — backend/.../data/port/. AI evidence.verification_quote обов’язкове лише у внутрішньому AI→Java контракті; назовні його немає. api-task має status OPEN/ACK/DONE.
