from types import SimpleNamespace

import pytest

from app import llm
from app.diagnose import Report, unknown


def test_live_transport_forces_tool_and_no_sdk_retry(monkeypatch, tmp_path):
    import anthropic
    observed = {}
    output = unknown('test').model_dump()

    class Client:
        def __init__(self, **kw): observed['client'] = kw; self.messages = self

        def create(self, **kw): observed['request'] = kw; return SimpleNamespace(
            content=[SimpleNamespace(type='tool_use', name='report_diagnosis', input=output)])

    monkeypatch.setattr(anthropic, 'Anthropic', Client)
    monkeypatch.setenv('REPLAY', '0')
    assert llm.call_llm({'evidence_pack': []}, Report.model_json_schema()) == output
    assert observed['client']['max_retries'] == 0
    assert observed['request']['temperature'] == 0
    assert observed['request']['tool_choice'] == {'type': 'tool', 'name': 'report_diagnosis'}


def test_record_replay_and_cache_isolation(monkeypatch, tmp_path):
    monkeypatch.setenv('LLM_CACHE_DIR', str(tmp_path))
    monkeypatch.setenv('REPLAY', '1')
    payload = {'evidence_pack': [{'line': 1, 'text': 'customer=[MASKED:email]'}]}
    schema = Report.model_json_schema()
    output = unknown('test').model_dump()
    llm.record(payload, schema, output)
    assert llm.call_llm(payload, schema) == output
    assert len(list(tmp_path.glob('*.json'))) == 1
    assert 'verification_quote' not in next(tmp_path.glob('*.json')).read_text()
    with pytest.raises(llm.ReplayMiss): llm.call_llm({'evidence_pack': []}, schema)
    monkeypatch.setenv('LLM_MODEL', 'different-model')
    with pytest.raises(llm.ReplayMiss): llm.call_llm(payload, schema)
