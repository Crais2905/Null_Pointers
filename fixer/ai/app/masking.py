"""Маскування PII до LLM: email, телефони, картки (13-19 цифр, Luhn), Bearer/API-токени, паролі в query -> [MASKED:тип].
Номери рядків не змінювати. Повертає (masked_text, counts)."""
