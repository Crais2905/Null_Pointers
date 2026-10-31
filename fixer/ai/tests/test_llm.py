import json
from types import SimpleNamespace
import pytest
import httpx
from google import genai
from google.genai import errors, types
from app import llm
from app.diagnose import Report, unknown

def test_live_gemini_uses_schema_timeout_and_closes_client(monkeypatch):
    seen = {}
    output = unknown('test').model_dump()
    class Client:
        def __init__(self, **kw): seen['client'] = kw; self.models = self
        def generate_content(self, **kw): seen['request'] = kw; return SimpleNamespace(text=json.dumps(output))
        def close(self): seen['closed'] = True
    monkeypatch.setattr(genai, 'Client', Client)
    monkeypatch.setenv('REPLAY','0'); monkeypatch.setenv('GEMINI_API_KEY','test-key')
    assert llm.call_llm({'evidence_pack':[]}, Report.model_json_schema()) == output
    assert seen['client']['http_options'].retry_options.attempts == 1
    assert seen['client']['http_options'].timeout == 20000
    assert seen['request']['config'].temperature == 0
    assert seen['request']['config'].response_json_schema == Report.model_json_schema()
    assert seen['request']['config'].response_mime_type == 'application/json'
    assert seen['closed']

def test_record_replay_and_cache_isolation(monkeypatch,tmp_path):
    monkeypatch.setenv('LLM_CACHE_DIR',str(tmp_path));monkeypatch.setenv('REPLAY','1')
    payload={'evidence_pack':[{'line':1,'text':'customer=[MASKED:email]'}]}
    schema=Report.model_json_schema();output=unknown('test').model_dump()
    llm.record(payload,schema,output)
    assert llm.call_llm(payload,schema)==output
    assert len(list(tmp_path.glob('*.json')))==1
    assert 'verification_quote' not in next(tmp_path.glob('*.json')).read_text()
    with pytest.raises(llm.ReplayMiss): llm.call_llm({'evidence_pack':[]},schema)
    monkeypatch.setenv('LLM_MODEL','different-model')
    with pytest.raises(llm.ReplayMiss):llm.call_llm(payload,schema)

def test_auto_mode_and_missing_key(monkeypatch):
    monkeypatch.setenv('REPLAY','auto');monkeypatch.delenv('GEMINI_API_KEY',raising=False)
    assert llm.replay_enabled()
    monkeypatch.setenv('GEMINI_API_KEY','test-key');assert not llm.replay_enabled()
    monkeypatch.delenv('GEMINI_API_KEY');monkeypatch.setenv('REPLAY','0')
    with pytest.raises(llm.LlmUnavailable,match='GEMINI_API_KEY'):llm.call_llm({}, {})

@pytest.mark.parametrize('failure,expected',[(httpx.ReadTimeout('timeout'),llm.LlmTimeout),(errors.ClientError(429,{'error':{'message':'secret-key'}}),llm.LlmUnavailable),(errors.ServerError(503,{'error':{'message':'secret-key'}}),llm.LlmUnavailable)])
def test_provider_failures_are_sanitized(monkeypatch,failure,expected):
    class Client:
        def __init__(self,**kw):self.models=self
        def generate_content(self,**kw):raise failure
        def close(self):pass
    monkeypatch.setattr(genai,'Client',Client)
    monkeypatch.setenv('REPLAY','0');monkeypatch.setenv('GEMINI_API_KEY','test-key')
    with pytest.raises(expected) as result:llm.call_llm({}, {})
    assert 'secret-key' not in str(result.value)
    assert 'test-key' not in str(result.value)

def test_real_sdk_serializes_schema_without_network(monkeypatch):
    output=unknown('sdk-test').model_dump()
    original_client=genai.Client
    observed={}
    def handler(request):
        observed['url']=str(request.url)
        observed['json']=json.loads(request.content)
        return httpx.Response(200,json={'candidates':[{'content':{'role':'model','parts':[{'text':json.dumps(output)}]},'finishReason':'STOP'}]})
    def client_factory(**kw):
        kw['http_options'].httpx_client=httpx.Client(transport=httpx.MockTransport(handler))
        return original_client(**kw)
    monkeypatch.setattr(genai,'Client',client_factory)
    monkeypatch.setenv('REPLAY','0');monkeypatch.setenv('GEMINI_API_KEY','fake-test-key')
    assert llm.call_llm({'evidence_pack':[]},Report.model_json_schema())==output
    assert 'generateContent' in observed['url']
    assert observed['json']['generationConfig']['responseMimeType']=='application/json'
    assert 'responseJsonSchema' in observed['json']['generationConfig']
