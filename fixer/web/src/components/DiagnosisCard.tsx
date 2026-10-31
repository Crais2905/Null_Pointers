import type { Diagnosis } from '../api/types';
import ConfidenceBar from './ConfidenceBar';
import { severityBadgeStyle } from './IncidentQueue';

interface DiagnosisCardProps {
  failed?: boolean;
  diagnosis?: Diagnosis | null;
  llmConfidence?: number | null;
  finalConfidence?: number | null;
  onJumpToLine?: (line: number) => void;
  activeLine?: number | null;
}

export default function DiagnosisCard({
  failed = false,
  diagnosis,
  llmConfidence,
  finalConfidence,
  onJumpToLine,
  activeLine,
}: DiagnosisCardProps) {
  if (!diagnosis) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          AI-Діагноз та докази
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          {failed ? 'Діагноз не отримано через помилку AI-сервісу.' : 'Діагноз ще формується або очікує завершення пайплайну...'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            AI-Діагноз
          </h3>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${severityBadgeStyle(
              diagnosis.severity
            )}`}
          >
            {diagnosis.severity}
          </span>
          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-900">
            {diagnosis.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500">Підозрюваний модуль:</span>
          {diagnosis.suspectedModuleId ? (
            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
              {diagnosis.suspectedModuleId}
            </span>
          ) : (
            <span className="rounded bg-orange-100 border border-orange-300 px-2 py-0.5 text-xs font-semibold text-orange-800">
              null (не визначено)
            </span>
          )}
        </div>
      </div>

      {/* Корінна причина */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <div className="text-[11px] font-semibold uppercase text-slate-500">
          Причина (Root Cause)
        </div>
        <p className="mt-1 text-sm font-medium text-slate-900">{diagnosis.rootCause}</p>
        {diagnosis.userImpact && (
          <p className="mt-1.5 text-xs text-slate-600">
            <strong>Вплив на користувача:</strong> {diagnosis.userImpact}
          </p>
        )}
      </div>

      {/* Смуга впевненості */}
      <ConfidenceBar
        llmConfidence={llmConfidence}
        finalConfidence={finalConfidence}
      />

      {/* Докази з логу */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Верифіковані докази з логу ({diagnosis.evidence.length})
          </h4>
          <span className="text-[11px] text-slate-500">
            Клікніть по доказу, щоб прокрутити лог до рядка
          </span>
        </div>

        {diagnosis.evidence.length === 0 ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
            Жодної перевіреної цитати не знайдено (0 валідних доказів → правило R1 NEEDS_TRIAGE).
          </div>
        ) : (
          <div className="space-y-2">
            {diagnosis.evidence.map((ev, i) => {
              const isSelected = activeLine === ev.line;
              return (
                <div
                  key={`${ev.line}-${i}`}
                  onClick={() => onJumpToLine?.(ev.line)}
                  className={`cursor-pointer rounded-lg border p-3 transition ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/50'
                      : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-500 px-2 py-0.5 font-mono text-xs font-bold text-white">
                        Рядок {ev.line}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {ev.why}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ev.verified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {ev.verified ? '✓ Цитування перевірено в сирому логу' : '✕ Не збігається'}
                    </span>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-amber-200">
                    {ev.quote}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Додаткові поля якщо присутні (suggestedFix, unknowns) */}
      {diagnosis.suggestedFix && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-slate-800">
          <strong className="text-indigo-900">Пропозиція виправлення: </strong>
          {diagnosis.suggestedFix}
        </div>
      )}

      {diagnosis.unknowns && diagnosis.unknowns.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
          <strong>Бриф для людини (чого бракує для впевненості):</strong>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {diagnosis.unknowns.map((u, idx) => (
              <li key={idx}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
