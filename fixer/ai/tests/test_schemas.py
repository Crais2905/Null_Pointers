import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import AnalyzeRequest, AnalyzeResponse

ROOT = Path(__file__).resolve().parents[2]


def load(name): return json.loads((ROOT / 'contracts' / name).read_text(encoding='utf-8'))


def test_contracts():
    AnalyzeRequest.model_validate(load('ai-analyze-log.request.json'))
    AnalyzeResponse.model_validate(load('ai-analyze-log.response.json'))


def test_confidence_bounds():
    payload = load('ai-analyze-log.response.json');
    payload['diagnosis']['confidence'] = 2
    with pytest.raises(ValidationError): AnalyzeResponse.model_validate(payload)


def test_unrelated_replay(monkeypatch):
    monkeypatch.setenv('REPLAY', '1')
    payload = load('ai-analyze-log.request.json');
    payload['log_text'] = 'unrelated log'
    with TestClient(app) as client:
        assert client.post('/ai/analyze-log', json=payload).status_code == 503
