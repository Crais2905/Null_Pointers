import type { AuditEntry } from '../api/types';

interface AuditTimelineProps {
  auditLog: AuditEntry[];
}

function actorBadge(actor: AuditEntry['actor']) {
  switch (actor) {
    case 'AI':
      return 'bg-violet-600 text-white';
    case 'HUMAN':
      return 'bg-emerald-600 text-white';
    default:
      return 'bg-slate-700 text-white';
  }
}

export default function AuditTimeline({ auditLog }: AuditTimelineProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Audit-хронологія пайплайну ({auditLog.length})
        </h3>
        <span className="text-[11px] text-slate-500">Актори: SYSTEM · AI · HUMAN</span>
      </div>

      {auditLog.length === 0 ? (
        <p className="text-xs text-slate-500">Записів аудиту поки немає.</p>
      ) : (
        <ol className="relative border-l-2 border-slate-200 ml-2 space-y-2.5 pl-4">
          {auditLog.map((entry, idx) => (
            <li key={`${entry.ts}-${idx}`} className="relative text-xs">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-600" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-slate-500">
                  {entry.ts}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${actorBadge(
                    entry.actor
                  )}`}
                >
                  {entry.actor}
                </span>
                <span className="font-medium text-slate-800">{entry.event}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
