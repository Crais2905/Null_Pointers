import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.schemas import AnalyzeRequest, AnalyzeResponse
ROOT=Path(__file__).resolve().parents[2]
def load(name): return json.loads((ROOT/'contracts'/name).read_text(encoding='utf-8'))
def test_contracts():
    AnalyzeRequest.model_validate(load('ai-analyze-log.request.json'))
    AnalyzeResponse.model_validate(load('ai-analyze-log.response.json'))
def test_replay_does_not_diagnose_unrelated_log(monkeypatch):
    monkeypatch.setenv('REPLAY','1')
    payload=load('ai-analyze-log.request.json')
    with TestClient(app) as client:
        assert client.post('/ai/analyze-log',json=payload).status_code==200
        payload['log_text']='unrelated log'
        assert client.post('/ai/analyze-log',json=payload).status_code==501
def test_confidence_bounds():
    payload=load('ai-analyze-log.response.json');payload['diagnosis']['confidence']=2
    with pytest.raises(ValidationError): AnalyzeResponse.model_validate(payload)
