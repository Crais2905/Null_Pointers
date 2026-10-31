"""One diagnosis call, one validation retry, local evidence restoration."""
import json
import os
from pydantic import Field, ValidationError
from .schemas import Model, Diagnosis, TaskDraft, Evidence
from .masking import redact, mask_pii
from .llm import call_llm, record, LlmTimeout, ReplayMiss, LlmUnavailable

class ModelEvidence(Model):
    line: int = Field(ge=1)
    quote: str = Field(min_length=1, max_length=200)
    why: str
class ModelDiagnosis(Diagnosis):
    evidence: list[ModelEvidence]
class Report(Model):
    diagnosis: ModelDiagnosis
    task_draft: TaskDraft


def unknown(reason):
    return Report(diagnosis=ModelDiagnosis(category='UNKNOWN',severity='P3',confidence=0,
        root_cause='Недостатньо перевірених даних для діагнозу.',suspected_module_id=None,
        required_skills=[],user_impact='',evidence=[],repro_steps=[],suggested_fix='',unknowns=[reason]),
        task_draft=TaskDraft(title='Потрібен ручний тріаж',description_md='Потрібно зібрати додаткові дані.',
            acceptance_criteria=['Зібрано лог із помилкою','Причину підтверджено доказами']))


def diagnose(payload, raw_text):
    report = None
    schema = Report.model_json_schema()
    for attempt in range(2):
        try:
            output = call_llm(payload, schema)
            # Redact model-generated strings too, including unexpected PII in prose.
            def clean(value):
                if isinstance(value,str): return mask_pii(value)[0]
                if isinstance(value,list): return [clean(v) for v in value]
                if isinstance(value,dict): return {k:clean(v) for k,v in value.items()}
                return value
            report = Report.model_validate(clean(output))
            if report.diagnosis.suspected_module_id not in {m['id'] for m in payload['module_catalog']}:
                report.diagnosis.suspected_module_id = None
            if report.diagnosis.category == 'UNKNOWN':
                report.diagnosis.confidence = min(report.diagnosis.confidence, .49)
            if os.getenv('RECORD','0') == '1' and os.getenv('REPLAY','1') != '1':
                record(payload,schema,report.model_dump(mode='json'))
            break
        except (LlmTimeout, ReplayMiss, LlmUnavailable):
            raise
        except (ValidationError, ValueError, TypeError):
            continue
        except Exception:
            return Diagnosis.model_validate(unknown('LLM недоступна').diagnosis.model_dump()), unknown('LLM недоступна').task_draft
    if report is None:
        report = unknown('Відповідь LLM не пройшла валідацію після повтору')
    raw_lines = raw_text.splitlines()
    allowed = {item['line']: item['text'] for item in payload['evidence_pack']}
    evidence = []
    for item in report.diagnosis.evidence:
        if item.line not in allowed or item.line > len(raw_lines) or item.quote not in allowed[item.line]:
            continue
        raw = raw_lines[item.line-1]
        restored = redact(raw).original_quote(raw,item.quote)
        if restored:
            evidence.append(Evidence(**item.model_dump(),verification_quote=restored))
    diagnosis = report.diagnosis.model_dump(exclude={'evidence'})
    diagnosis['evidence'] = [e.model_dump() for e in evidence]
    return Diagnosis.model_validate(diagnosis), report.task_draft
