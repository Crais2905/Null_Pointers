from pathlib import Path
from app.parser import parse_log
from app.detectors import detect
from app.schemas import AnalyzeRequest
from app.evidence_pack import build_evidence_pack
import pytest

ROOT = Path(__file__).resolve().parents[1]


def request(text, **kw):
    return AnalyzeRequest(incident_id=1, log_text=text, module_catalog=[], **kw)


@pytest.mark.parametrize('name,expected',
                         [('dup_charge', {'D1'}), ('dup_charge_again', {'D1'}), ('promo_npe', {'D5', 'D2'}),
                          ('courier_timeout', {'D3', 'D4'}), ('ambiguous', set())])
def test_demo_findings(name, expected):
    text = (ROOT / 'fixtures' / f'{name}.log').read_text()
    req = request(text)
    findings, signature = detect(parse_log(text)[0], req)
    assert expected <= {f.detector for f in findings}
    if name == 'ambiguous': assert not signature


def test_signature_stability():
    signatures = []
    for name in ['dup_charge', 'dup_charge_again']:
        text = (ROOT / 'fixtures' / f'{name}.log').read_text()
        signatures.append(detect(parse_log(text)[0], request(text))[1])
    assert signatures == ['dup_request POST /api/pay'] * 2


def test_auth_correlation_and_pack_bound():
    text = '\n'.join(f'2026-10-31T12:00:00Z ERROR [auth] order=2 -> 401 token expired {n}' for n in range(500))
    req = request(text, order_id=2)
    events, _ = parse_log(text)
    findings, _ = detect(events, req)
    assert {'D6', 'D7'} <= {f.detector for f in findings}
    pack = build_evidence_pack(text, events, findings, req)
    assert len(pack) <= 150
    assert all(item['text'] == text.splitlines()[item['line'] - 1] for item in pack)


@pytest.mark.parametrize('suffix,expected', [('request_id=a POST /pay order=1 -> 200', False),
                                             ('request_id=b POST /pay order=1 -> 500', False),
                                             ('request_id=b POST /pay order=2 -> 200', False),
                                             ('request_id=b POST /pay order=1 -> 200', True)])
def test_duplicate_requires_distinct_successful_request_for_same_entity(suffix, expected):
    text = '2026-10-31T12:00:00Z INFO [api] request_id=a POST /pay order=1 -> 200\n2026-10-31T12:00:01Z INFO [api] ' + suffix
    findings, _ = detect(parse_log(text)[0], request(text))
    assert any(f.detector == 'D1' for f in findings) == expected
