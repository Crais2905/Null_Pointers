import incident from './mocks/incident.mock.json';
import developers from './mocks/api-developers.json';
import task from './mocks/api-task.json';
import metrics from './mocks/api-metrics.json';
import type { Incident } from './types';
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';
async function req<T>(path: string, init?: RequestInit): Promise<T> {
 const headers = new Headers(init?.headers);
 if (!(init?.body instanceof FormData)) headers.set('Content-Type','application/json');
 const r=await fetch(BASE+path,{...init,headers});
 if(!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
 return r.json();
}
function pending<T>(): Promise<T> { return Promise.reject(new Error('Мок: дія ще не реалізована')); }
export const api = {
 createIncident: (b: unknown) => USE_MOCKS ? pending() : req('/api/incidents',{method:'POST',body:JSON.stringify(b)}),
 uploadIncident: (b: FormData) => USE_MOCKS ? pending() : req('/api/incidents',{method:'POST',body:b}),
 listIncidents: () => USE_MOCKS ? Promise.resolve([incident as Incident]) : req<Incident[]>('/api/incidents'),
 getIncident: (id: number) => USE_MOCKS ? Promise.resolve(incident as Incident) : req<Incident>(`/api/incidents/${id}`),
 confirm: (id: number, assigneeId?: string) => USE_MOCKS ? pending() : req(`/api/incidents/${id}/confirm`,{method:'POST',body:JSON.stringify({assigneeId})}),
 dismiss: (id: number) => USE_MOCKS ? pending() : req(`/api/incidents/${id}/dismiss`,{method:'POST'}),
 simulate: (scenario: string) => USE_MOCKS ? pending() : req('/api/incidents/simulate',{method:'POST',body:JSON.stringify({scenario})}),
 developers: () => USE_MOCKS ? Promise.resolve(developers) : req<typeof developers>('/api/developers'),
 tasks: (assigneeId: string) => USE_MOCKS ? Promise.resolve(assigneeId===task.assigneeId?[task]:[]) : req<(typeof task)[]>(`/api/tasks?assigneeId=${encodeURIComponent(assigneeId)}`),
 setTaskStatus: (id: number,status:'ACK'|'DONE') => USE_MOCKS ? pending() : req(`/api/tasks/${id}`,{method:'PATCH',body:JSON.stringify({status})}),
 settings: () => USE_MOCKS ? Promise.resolve({autoDispatch:true}) : req<{autoDispatch:boolean}>('/api/settings'),
 putSettings: (b: unknown) => USE_MOCKS ? pending() : req('/api/settings',{method:'PUT',body:JSON.stringify(b)}),
 metrics: () => USE_MOCKS ? Promise.resolve(metrics) : req<typeof metrics>('/api/metrics'),
 modules: () => req('/api/modules'),
 reset: () => USE_MOCKS ? pending() : req('/api/reset',{method:'POST'}),
 markdown: async (id: number) => { if(USE_MOCKS) return task.bodyMd; const r=await fetch(`${BASE}/api/tasks/${id}.md`); if(!r.ok) throw new Error(String(r.status)); return r.text(); },
};
