from app.masking import mask_pii, redact, luhn


def test_pii_and_local_mapping():
    raw = 'email=jane@example.com card=4111 1111 1111 1111 phone=+380501234567 Bearer secret123 password=hello'
    masked, counts = mask_pii(raw)
    assert all(
        secret not in masked for secret in ['jane@example.com', '4111 1111', '380501234567', 'secret123', 'hello'])
    assert counts == {'email': 1, 'card': 1, 'phone': 1, 'token': 1, 'password': 1}
    assert redact(raw).original_quote(raw, 'email=[MASKED:email]') == 'email=jane@example.com'
    assert redact(raw).original_quote(raw, 'MASKED:email') is None


def test_luhn_and_newlines():
    assert luhn('4111111111111111')
    assert not luhn('4111111111111112')
    text = 'x=a@example.com\r\nnext\n'
    assert mask_pii(text)[0].splitlines() == ['x=[MASKED:email]', 'next']


def test_json_secrets_and_national_phone():
    text = '{"api_key": "secret1", "password": "secret2", "phone": "0501234567"}'
    masked, counts = mask_pii(text)
    assert all(s not in masked for s in ['secret1', 'secret2', '0501234567'])
    assert counts == {'token': 1, 'password': 1, 'phone': 1}


def test_redaction_never_consumes_newline():
    assert mask_pii('token=abc\npassword=\nsecret\n')[0].count('\n') == 3
