import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import diagnose as service
from app.diagnose import Report, unknown, diagnose
from app.llm import LlmTimeout
from app.masking import mask_pii

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize('name,category,module', [('DUP_CHARGE', 'PAYMENT_DUPLICATE', 'payments'),
                                                  ('DUP_CHARGE_AGAIN', 'PAYMENT_DUPLICATE', 'payments'),
                                                  ('PROMO_NPE', 'UNHANDLED_EXCEPTION', 'promo'),
                                                  ('COURIER_TIMEOUT', 'UPSTREAM_TIMEOUT', 'courier-integration'),
                                                  ('AMBIGUOUS', 'UNKNOWN', None)])
def test_demo_http(name, category, module, monkeypatch):
    monkeypatch.setenv('REPLAY', '1')
    payload = json.loads((ROOT / 'fixtures/demo_requests.json').read_text(encoding='utf-8'))[name]
    with TestClient(app) as client:
        response = client.post('/ai/analyze-log', json=payload)
        assert response.status_code == 200, response.text
        body = response.json()
        assert body['diagnosis']['category'] == category
        assert body['diagnosis']['suspected_module_id'] == module
        for e in body['diagnosis']['evidence']:
            assert e['verification_quote'] in payload['log_text'].splitlines()[e['line'] - 1]
        payload['incident_id'] = 999
        assert client.post('/ai/analyze-log', json=payload).status_code == 200


def test_local_quote_and_no_private_schema(monkeypatch):
    raw = 'customer=a@example.com failed'
    quote = mask_pii(raw)[0]
    output = unknown('test').model_dump()
    output['diagnosis']['evidence'] = [dict(line=1, quote=quote, why='error'),
                                       dict(line=2, quote='invented', why='bad')]

    def fake(payload, schema):
        assert 'verification_quote' not in json.dumps(schema)
        assert 'a@example.com' not in json.dumps(payload)
        return output

    monkeypatch.setattr(service, 'call_llm', fake)
    result, _ = diagnose(dict(evidence_pack=[dict(line=1, text=quote)], module_catalog=[]), raw)
    assert len(result.evidence) == 1
    assert result.evidence[0].verification_quote == raw
    assert result.evidence[0].quote == quote


def test_validation_retry_fallback(monkeypatch):
    calls = []

    def fake(*args): calls.append(1); return {'bad': 'schema'}

    monkeypatch.setattr(service, 'call_llm', fake)
    result, _ = diagnose(dict(evidence_pack=[], module_catalog=[]), 'x')
    assert len(calls) == 2
    assert result.category == 'UNKNOWN' and result.confidence == 0


def test_timeout_http(monkeypatch):
    def timeout(*args): raise LlmTimeout()

    monkeypatch.setattr(service, 'call_llm', timeout)
    with TestClient(app) as client:
        assert client.post('/ai/analyze-log',
                           json=dict(incident_id=1, log_text='x', module_catalog=[])).status_code == 504
        assert client.post('/ai/analyze-log',
                           json=dict(incident_id=1, log_text='', module_catalog=[])).status_code == 422


def test_unknown_module_normalized(monkeypatch):
    output = unknown('test').model_dump();
    output['diagnosis']['suspected_module_id'] = 'invented'
    monkeypatch.setattr(service, 'call_llm', lambda *args: output)
    result, _ = diagnose(dict(evidence_pack=[], module_catalog=[]), 'x')
    assert result.suspected_module_id is None


def test_http_limits_preserve_original_line_numbers(monkeypatch):
    def fake(payload, schema): return unknown('test').model_dump()

    monkeypatch.setattr(service, 'call_llm', fake)
    with TestClient(app) as client:
        response = client.post('/ai/analyze-log',
                               json=dict(incident_id=1, log_text='plain\n' * 20001, module_catalog=[]))
        assert response.status_code == 200
        assert response.json()['parsed']['lines_total'] == 20000
        assert response.json()['parsed']['truncated'] is True
