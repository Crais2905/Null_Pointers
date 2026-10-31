// Типи за contracts/api-incident.json і contracts/enums.md
export type Severity = "P1" | "P2" | "P3";
export type IncidentStatus =
  | "NEW"
  | "ANALYZING"
  | "DIAGNOSED"
  | "AUTO_DISPATCHED"
  | "PENDING_CONFIRM"
  | "NEEDS_TRIAGE"
  | "DEDUPLICATED"
  | "DISMISSED"
  | "FAILED";

export type Category =
  | "PAYMENT_DUPLICATE"
  | "UNHANDLED_EXCEPTION"
  | "UPSTREAM_TIMEOUT"
  | "AUTH_FAILURE"
  | "DATA_INCONSISTENCY"
  | "CONFIG_ERROR"
  | "UNKNOWN";

export type TaskStatus = "OPEN" | "ACK" | "DONE";
export type DeliveryStatus = "IN_APP" | "WEBHOOK_OK" | "WEBHOOK_FAILED";
export type Actor = "SYSTEM" | "AI" | "HUMAN";
export type Scenario =
  | "DUP_CHARGE"
  | "PROMO_NPE"
  | "COURIER_TIMEOUT"
  | "DUP_CHARGE_AGAIN"
  | "AMBIGUOUS";

export interface Evidence {
  line: number;
  quote: string;
  why: string;
  verified: boolean;
}

export interface Candidate {
  developerId: string;
  name: string;
  score: number;
  reasons: string[];
}

export interface Finding {
  detector: string;
  line_numbers: number[];
  excerpt: string;
  note: string;
}

export interface PipelineStage {
  name: string;
  status: string;
  ms?: number;
}

export interface Diagnosis {
  category: Category | string;
  severity: Severity;
  rootCause: string;
  suspectedModuleId: string | null;
  evidence: Evidence[];
  userImpact?: string;
  reproSteps?: string[];
  suggestedFix?: string;
  unknowns?: string[];
  requiredSkills?: string[];
}

export interface Decision {
  outcome: string;
  rule: string;
  reason: string;
}

export interface DevTask {
  id: number;
  title: string;
  priority: Severity;
  assigneeId: string;
  backupId?: string | null;
  occurrences: number;
  bodyMd: string;
  deliveryStatus: DeliveryStatus | string;
  status?: TaskStatus;
  incidentId?: number;
  createdAt?: string;
  dispatchedAt?: string;
}

export interface AuditEntry {
  ts: string;
  actor: Actor;
  event: string;
}

export interface Incident {
  id: number;
  status: IncidentStatus;
  userMessage: string;
  orderId?: number | null;
  userId?: number | null;
  complaintAt?: string | null;
  createdAt?: string;
  stages: PipelineStage[];
  logLines: number;
  rawLog?: string;
  findings: Finding[];
  diagnosis?: Diagnosis | null;
  llmConfidence?: number | null;
  finalConfidence?: number | null;
  candidates: Candidate[];
  decision?: Decision | null;
  task?: DevTask | null;
  dedupOf: number | null;
  pipelineSeconds?: number | null;
  error?: string | null;
  auditLog: AuditEntry[];
}

export interface IncidentSummary {
  id: number;
  status: IncidentStatus;
  title: string | null;
  severity: Severity | null;
  assignee: { id: string; name: string } | null;
  createdAt: string;
}

export interface DeveloperOwnership {
  id: string;
  level: "primary" | "secondary" | string;
}

export interface Developer {
  id: string;
  name: string;
  role: "BACKEND" | "FRONTEND" | "DEVOPS" | string;
  available: boolean;
  handle: string;
  skills: string[];
  ownedModules: DeveloperOwnership[];
}

export interface ModuleCatalogItem {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export interface Metrics {
  avgPipelineSec: number;
  autoDispatchedPercent: number;
  dedupMerged: number;
  total: number;
}

export interface Settings {
  autoDispatch: boolean;
}

export interface CreateIncidentRequest {
  userMessage: string;
  log: string;
  orderId?: number | null;
  userId?: number | null;
  complaintAt?: string | null;
}

export interface AcceptedIncidentResponse {
  id: number;
  status: IncidentStatus;
}
