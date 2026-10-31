import type { IncidentStatus, IncidentSummary, Severity } from '../api/types';

interface IncidentQueueProps {
  incidents: IncidentSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh?: () => void;
}

export function statusBadgeStyle(status: IncidentStatus): {
  label: string;
  classes: string;
} {
  switch (status) {
    case 'NEW':
      return { label: 'NEW', classes: 'bg-sky-100 text-sky-800 border-sky-200' };
    case 'ANALYZING':
      return {
        label: 'ANALYZING...',
        classes: 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse',
      };
    case 'DIAGNOSED':
      return {
        label: 'DIAGNOSED',
        classes: 'bg-violet-100 text-violet-800 border-violet-200',
      };
    case 'AUTO_DISPATCHED':
      return {
        label: 'AUTO_DISPATCHED',
        classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'PENDING_CONFIRM':
      return {
        label: 'PENDING_CONFIRM',
        classes: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    case 'NEEDS_TRIAGE':
      return {
        label: 'NEEDS_TRIAGE',
        classes: 'bg-orange-100 text-orange-800 border-orange-300',
      };
    case 'DEDUPLICATED':
      return {
        label: 'DEDUPLICATED',
        classes: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    case 'DISMISSED':
      return {
        label: 'DISMISSED',
        classes: 'bg-slate-200 text-slate-600 border-slate-300',
      };
    case 'FAILED':
      return {
        label: 'FAILED',
        classes: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    default:
      return {
        label: status,
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export function severityBadgeStyle(severity?: Severity | null): string {
  switch (severity) {
    case 'P1':
      return 'bg-rose-600 text-white';
    case 'P2':
      return 'bg-amber-500 text-white';
    case 'P3':
      return 'bg-slate-500 text-white';
    default:
      return 'bg-slate-200 text-slate-600';
  }
}

export default function IncidentQueue({
  incidents,
  selectedId,
  onSelect,
  onRefresh,
}: IncidentQueueProps) {
  return (
    <aside className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Черга інцидентів</h2>
          <p className="text-xs text-slate-500">Всього: {incidents.length}</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            title="Оновити список інцидентів"
          >
            Оновити
          </button>
        )}
      </div>

      {incidents.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500">
          Черга порожня. Запустіть один із демо-сценаріїв зверху або додайте лог вручну.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[750px] overflow-y-auto">
          {incidents.map((item) => {
            const active = item.id === selectedId;
            const st = statusBadgeStyle(item.status);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left px-4 py-3 transition ${
                    active
                      ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        #{item.id}
                      </span>
                      {item.severity && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${severityBadgeStyle(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.classes}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-xs font-medium text-slate-800">
                    {item.title ?? 'Аналіз триває...'}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {item.assignee ? `→ ${item.assignee.name}` : 'Без виконавця'}
                    </span>
                    <span>
                      {item.createdAt
                        ? item.createdAt.replace('T', ' ').slice(11, 19)
                        : ''}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
