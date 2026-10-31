"""Парсер: текст `ts LEVEL [service] k=v msg`, JSON lines, багаторядкові стек-трейси.
Нерозпізнані рядки зберігаються як raw. events: line, ts, level, service, trace_id, order_id, message, raw. Ліміт 20000 рядків / 5 МБ."""
