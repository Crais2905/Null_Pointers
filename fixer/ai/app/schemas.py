from typing import Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
class Model(BaseModel):
    model_config = ConfigDict(extra='forbid')
class Module(Model):
    id: str
    name: str
    description: str
    keywords: list[str]
class AnalyzeRequest(Model):
    incident_id: int
    user_message: str = ''
    complaint_at: datetime | None = None
    order_id: int | None = None
    user_id: int | None = None
    log_text: str = Field(min_length=1)
    module_catalog: list[Module]
class Finding(Model):
    detector: Literal['D1','D2','D3','D4','D5','D6','D7']
    line_numbers: list[int]
    excerpt: str
    note: str
class Evidence(Model):
    line: int = Field(ge=1)
    quote: str = Field(max_length=200)
    why: str
    verification_quote: str = Field(max_length=200)
class Diagnosis(Model):
    category: Literal['PAYMENT_DUPLICATE','UNHANDLED_EXCEPTION','UPSTREAM_TIMEOUT','AUTH_FAILURE','DATA_INCONSISTENCY','CONFIG_ERROR','UNKNOWN']
    severity: Literal['P1','P2','P3']
    confidence: float = Field(ge=0,le=1)
    root_cause: str
    suspected_module_id: str | None
    required_skills: list[Literal['java','spring','sql','payments','idempotency','caching','auth','react','css','ux-states','devops','kubernetes','network','timeouts','observability']]
    user_impact: str
    evidence: list[Evidence]
    repro_steps: list[str]
    suggested_fix: str
    unknowns: list[str]
class TaskDraft(Model):
    title: str = Field(max_length=80)
    description_md: str
    acceptance_criteria: list[str] = Field(min_length=2,max_length=4)
class Parsed(Model):
    lines_total: int = Field(ge=0)
    time_range: list[str | None]
    services: list[str]
    levels: dict[str,int]
    truncated: bool
    masked: dict[str,int]
class AnalyzeResponse(Model):
    parsed: Parsed
    findings: list[Finding]
    signature: str
    diagnosis: Diagnosis
    task_draft: TaskDraft
    timings_ms: dict[str,int]
