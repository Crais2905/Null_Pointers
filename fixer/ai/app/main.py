import json
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from .schemas import AnalyzeRequest, AnalyzeResponse
app = FastAPI(title='Fixer log triage — scaffold')
CACHE = Path(__file__).resolve().parents[1] / 'cache'
@app.get('/health')
def health():
    return {'status':'ok','mode':'scaffold'}
@app.post('/ai/analyze-log', response_model=AnalyzeResponse)
def analyze_log(req: AnalyzeRequest):
    if os.getenv('REPLAY','1') == '1':
        payload=req.model_dump(mode='json')
        for path in CACHE.glob('*.json'):
            entry=json.loads(path.read_text(encoding='utf-8'))
            expected=AnalyzeRequest.model_validate(entry['request']).model_dump(mode='json')
            # Incident id is transport metadata; all analysis inputs must match.
            if {k:v for k,v in payload.items() if k!='incident_id'} == {k:v for k,v in expected.items() if k!='incident_id'}:
                return entry['response']
    raise HTTPException(501,'Scaffold: no matching replay. Implement masking/parser/detectors/LLM.')
