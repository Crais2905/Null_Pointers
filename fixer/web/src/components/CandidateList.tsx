import type { Candidate } from '../api/types';

interface CandidateListProps {
  candidates: Candidate[];
  selectedAssigneeId?: string;
  onSelectCandidate?: (developerId: string) => void;
}

export default function CandidateList({
  candidates,
  selectedAssigneeId,
  onSelectCandidate,
}: CandidateListProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Кандидати маршрутизації (Детермінований скоринг Java)
          </h3>
          <p className="text-[11px] text-slate-500">
            Поріг компетентності: <strong>score ≥ 40</strong> · №1 — основний виконавець, №2 — backup
          </p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="text-xs text-slate-500">
          Кандидатів ще не розраховано або немає доступних розробників.
        </p>
      ) : (
        <div className="space-y-2.5">
          {candidates.map((cand, index) => {
            const isCompetent = cand.score >= 40;
            const roleLabel =
              index === 0
                ? '№1 · Основний (Assignee)'
                : index === 1
                ? '№2 · Резервний (Backup)'
                : `№${index + 1}`;
            const isSelected = selectedAssigneeId === cand.developerId;

            return (
              <div
                key={cand.developerId}
                onClick={() => onSelectCandidate?.(cand.developerId)}
                className={`rounded-lg border p-3 transition ${
                  onSelectCandidate ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                    : isCompetent
                    ? 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                    : 'border-orange-200 bg-orange-50/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        index === 0
                          ? 'bg-indigo-600 text-white'
                          : index === 1
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {roleLabel}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{cand.name}</span>
                    <span className="font-mono text-xs text-slate-500">
                      ({cand.developerId})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
                        isCompetent
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-orange-100 text-orange-800 border border-orange-300'
                      }`}
                    >
                      {cand.score} балів {isCompetent ? '✓' : '(< 40)'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cand.reasons.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
