import type { Finding } from '../api/types';

interface FindingsListProps {
  findings: Finding[];
  onJumpToLine?: (line: number) => void;
}

const DETECTOR_LABELS: Record<string, string> = {
  D1: 'D1 · duplicate_request (Подвійний запит)',
  D2: 'D2 · error_burst (Сплеск помилок)',
  D3: 'D3 · retry_storm (Лавина повторів)',
  D4: 'D4 · upstream_failure (Збій зовнішнього сервісу)',
  D5: 'D5 · exception_trace (Виняток / Стек-трейс)',
  D6: 'D6 · auth_failure (Помилка авторизації)',
  D7: 'D7 · correlation (Зв’язок зі скаргою)',
};

export default function FindingsList({ findings, onJumpToLine }: FindingsListProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Спрацювання детекторів логу (D1–D7, без LLM)
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {findings.length}
        </span>
      </div>

      {findings.length === 0 ? (
        <p className="text-xs text-slate-500">
          Жоден детермінований детектор D1–D7 не знайшов явних аномалій у логу.
        </p>
      ) : (
        <div className="space-y-2.5">
          {findings.map((f, idx) => (
            <div
              key={`${f.detector}-${idx}`}
              className="rounded-lg border border-sky-200 bg-sky-50/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center rounded bg-sky-700 px-2 py-0.5 text-xs font-bold text-white">
                  {DETECTOR_LABELS[f.detector] ?? f.detector}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-slate-500">Рядки:</span>
                  {f.line_numbers.map((ln) => (
                    <button
                      key={ln}
                      type="button"
                      onClick={() => onJumpToLine?.(ln)}
                      className="rounded border border-sky-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
                    >
                      #{ln}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-1.5 text-xs font-medium text-slate-800">{f.note}</p>
              <pre className="mt-1.5 overflow-x-auto rounded bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-sky-200">
                {f.excerpt}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
