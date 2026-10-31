"""Stateless AI analysis HTTP service."""
from time import perf_counter
from fastapi import FastAPI, HTTPException
from .schemas import AnalyzeRequest, AnalyzeResponse, Parsed
from .masking import mask_pii
from .parser import parse_log, truncate
from .detectors import detect
from .evidence_pack import build_evidence_pack
from .diagnose import diagnose
from .llm import LlmTimeout, ReplayMiss

app = FastAPI(title='Fixer log triage')

@app.get('/health')
def health():
    return {'status':'ok'}

def prepare_analysis(req: AnalyzeRequest):
    started = perf_counter()
    raw, truncated = truncate(req.log_text)
    masked, counts = mask_pii(raw)
    events, summary = parse_log(masked)
    parse_ms = round((perf_counter()-started)*1000)
    started = perf_counter()
    findings, signature = detect(events, req)
    pack = build_evidence_pack(masked,events,findings,req)
    detector_ms = round((perf_counter()-started)*1000)
    payload = dict(user_message=mask_pii(req.user_message)[0],evidence_pack=pack,
        findings=[f.model_dump() for f in findings],summary=summary,
        module_catalog=[{k:mask_pii(v)[0] if isinstance(v,str) else [mask_pii(x)[0] for x in v] for k,v in m.model_dump().items()} for m in req.module_catalog])
    return raw, summary, truncated, counts, findings, signature, payload, parse_ms, detector_ms


@app.post('/ai/analyze-log', response_model=AnalyzeResponse)
def analyze_log(req: AnalyzeRequest):
    raw, summary, truncated, counts, findings, signature, payload, parse_ms, detector_ms = prepare_analysis(req)
    started = perf_counter()
    try:
        diagnosis, draft = diagnose(payload,raw)
    except LlmTimeout:
        raise HTTPException(504, 'LLM timeout')
    except ReplayMiss:
        raise HTTPException(503, 'No matching replay diagnosis')
    return AnalyzeResponse(parsed=Parsed(**summary,truncated=truncated,masked=counts),findings=findings,
        signature=signature,diagnosis=diagnosis,task_draft=draft,
        timings_ms={'parse':parse_ms,'detectors':detector_ms,'llm':round((perf_counter()-started)*1000)})
