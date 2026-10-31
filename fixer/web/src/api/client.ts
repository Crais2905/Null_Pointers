import { mockEngine } from './mockEngine';
import type {
  AcceptedIncidentResponse,
  CreateIncidentRequest,
  Developer,
  DevTask,
  Incident,
  IncidentSummary,
  Metrics,
  ModuleCatalogItem,
  Scenario,
  Settings,
} from './types';

export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const ENV_USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const MODE_STORAGE_KEY = 'fixer_api_mode'; // 'mock' | 'java'

export function getApiMode(): 'mock' | 'java' {
  try {
    const requested = new URLSearchParams(window.location.search).get('api');
    if (requested === 'java' || requested === 'mock') {
      localStorage.setItem(MODE_STORAGE_KEY, requested);
      return requested;
    }
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === 'mock' || saved === 'java') return saved;
  } catch {
    // ignore storage errors
  }
  return ENV_USE_MOCKS ? 'mock' : 'java';
}

export function setApiMode(mode: 'mock' | 'java'): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    const url = new URL(window.location.href);
    url.searchParams.delete('api');
    window.history.replaceState({}, '', url);
  } catch {
    // ignore
  }
}

export function isUsingMocks(): boolean {
  return getApiMode() === 'mock';
}

export const USE_MOCKS = ENV_MOCK_DEFAULT();
function ENV_MOCK_DEFAULT() {
  return ENV_USE_MOCKS;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const r = await fetch(BASE + path, { ...init, headers });
  if (!r.ok) {
    const text = await r.text();
    let msg = `${r.status}: ${text}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.message) {
        msg = `${r.status} (${parsed.code ?? 'ERROR'}): ${parsed.message}`;
      }
    } catch {
      // plain text error
    }
    throw new Error(msg);
  }
  if (r.status === 204) {
    return undefined as T;
  }
  const contentType = r.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return r.json();
  }
  const txt = await r.text();
  return (txt ? JSON.parse(txt) : undefined) as T;
}

export const api = {
  createIncident: (b: CreateIncidentRequest): Promise<AcceptedIncidentResponse> =>
    isUsingMocks()
      ? mockEngine.createIncident(b)
      : req<AcceptedIncidentResponse>('/api/incidents', {
          method: 'POST',
          body: JSON.stringify(b),
        }),

  uploadIncident: (b: FormData): Promise<AcceptedIncidentResponse> =>
    isUsingMocks()
      ? mockEngine.uploadIncident(b)
      : req<AcceptedIncidentResponse>('/api/incidents', {
          method: 'POST',
          body: b,
        }),

  listIncidents: (): Promise<IncidentSummary[]> =>
    isUsingMocks() ? mockEngine.listIncidents() : req<IncidentSummary[]>('/api/incidents'),

  getIncident: (id: number): Promise<Incident> =>
    isUsingMocks() ? mockEngine.getIncident(id) : req<Incident>(`/api/incidents/${id}`),

  confirm: (id: number, assigneeId?: string): Promise<Incident> =>
    isUsingMocks()
      ? mockEngine.confirm(id, assigneeId)
      : req<Incident>(`/api/incidents/${id}/confirm`, {
          method: 'POST',
          body: JSON.stringify(assigneeId ? { assigneeId } : {}),
        }),

  dismiss: (id: number): Promise<Incident> =>
    isUsingMocks()
      ? mockEngine.dismiss(id)
      : req<Incident>(`/api/incidents/${id}/dismiss`, { method: 'POST' }),

  simulate: (scenario: Scenario | string): Promise<AcceptedIncidentResponse> =>
    isUsingMocks()
      ? mockEngine.simulate(scenario)
      : req<AcceptedIncidentResponse>('/api/incidents/simulate', {
          method: 'POST',
          body: JSON.stringify({ scenario }),
        }),

  developers: (): Promise<Developer[]> =>
    isUsingMocks() ? mockEngine.developers() : req<Developer[]>('/api/developers'),

  modules: (): Promise<ModuleCatalogItem[]> =>
    isUsingMocks() ? mockEngine.modules() : req<ModuleCatalogItem[]>('/api/modules'),

  tasks: (assigneeId?: string): Promise<DevTask[]> =>
    isUsingMocks()
      ? mockEngine.tasks(assigneeId)
      : req<DevTask[]>(
          assigneeId
            ? `/api/tasks?assigneeId=${encodeURIComponent(assigneeId)}`
            : '/api/tasks'
        ),

  setTaskStatus: (id: number, status: 'ACK' | 'DONE'): Promise<DevTask> =>
    isUsingMocks()
      ? mockEngine.setTaskStatus(id, status)
      : req<DevTask>(`/api/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),

  settings: (): Promise<Settings> =>
    isUsingMocks() ? mockEngine.settings() : req<Settings>('/api/settings'),

  putSettings: (b: Settings): Promise<Settings> =>
    isUsingMocks()
      ? mockEngine.putSettings(b)
      : req<Settings>('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(b),
        }),

  metrics: (): Promise<Metrics> =>
    isUsingMocks() ? mockEngine.metrics() : req<Metrics>('/api/metrics'),

  reset: (): Promise<void> =>
    isUsingMocks()
      ? mockEngine.reset()
      : req<void>('/api/reset', { method: 'POST' }),

  markdown: async (id: number): Promise<string> => {
    if (isUsingMocks()) return mockEngine.markdown(id);
    const r = await fetch(`${BASE}/api/tasks/${id}.md`);
    if (!r.ok) throw new Error(`${r.status}: Не вдалося завантажити Markdown`);
    return r.text();
  },

  getSamplePreset: (scenario: Scenario) => mockEngine.getSampleLog(scenario),
};
