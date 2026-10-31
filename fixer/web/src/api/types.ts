// Типи за contracts/api-incident.json і contracts/enums.md
export type Severity = "P1" | "P2" | "P3";
export type IncidentStatus = "NEW" | "ANALYZING" | "DIAGNOSED" | "AUTO_DISPATCHED" | "PENDING_CONFIRM" | "NEEDS_TRIAGE" | "DEDUPLICATED" | "DISMISSED" | "FAILED";
export interface Evidence { line: number; quote: string; why: string; verified: boolean }
export interface Candidate { developerId: string; name: string; score: number; reasons: string[] }
export interface Incident {
  id: number; status: IncidentStatus; userMessage: string;
  stages: { name: string; status: string; ms?: number }[];
  logLines: number; rawLog?: string;
  findings: { detector: string; line_numbers: number[]; excerpt: string; note: string }[];
  diagnosis?: { category: string; severity: Severity; rootCause: string; suspectedModuleId: string | null; evidence: Evidence[] };
  llmConfidence?: number; finalConfidence?: number;
  candidates: Candidate[];
  decision?: { outcome: string; rule: string; reason: string };
  task?: { id: number; title: string; priority: Severity; assigneeId: string; backupId?: string; occurrences: number; bodyMd: string; deliveryStatus: string };
  dedupOf: number | null; pipelineSeconds?: number;
  auditLog: { ts: string; actor: "SYSTEM" | "AI" | "HUMAN"; event: string }[];
}

export interface IncidentSummary { id: number; status: IncidentStatus; title: string | null; severity: Severity | null; assignee: {id: string; name: string} | null; createdAt: string }
