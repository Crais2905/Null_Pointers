import type { PipelineStage } from '../api/types';

interface PipelineStagesProps {
  stages: PipelineStage[];
  pipelineSeconds?: number | null;
  error?: string | null;
}

const DEFAULT_STAGE_ORDER = [
  { name: 'PARSE', label: '1. Парсер & PII' },
  { name: 'DETECT', label: '2. Детектори D1–D7' },
  { name: 'DIAGNOSE', label: '3. AI-Діагноз' },
  { name: 'VERIFY_EVIDENCE', label: '4. Перевірка доказів' },
  { name: 'ROUTE', label: '5. Скоринг девів' },
  { name: 'DISPATCH', label: '6. Відправка' },
];

function stageStyle(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'DONE' || normalized === 'COMPLETED' || normalized === 'OK') {
    return {
      dot: 'bg-emerald-500 text-white',
      card: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      icon: '✓',
    };
  }
  if (normalized === 'IN_PROGRESS' || normalized === 'RUNNING' || normalized === 'ANALYZING') {
    return {
      dot: 'bg-indigo-600 text-white animate-pulse',
      card: 'border-indigo-300 bg-indigo-50 text-indigo-950',
      icon: '⟳',
    };
  }
  if (normalized === 'FAILED' || normalized === 'ERROR') {
    return {
      dot: 'bg-rose-600 text-white',
      card: 'border-rose-300 bg-rose-50 text-rose-950',
      icon: '✕',
    };
  }
  if (normalized === 'WAITING' || normalized === 'SKIPPED') {
    return {
      dot: 'bg-amber-500 text-white',
      card: 'border-amber-200 bg-amber-50/70 text-amber-900',
      icon: '•',
    };
  }
  return {
    dot: 'bg-slate-300 text-slate-700',
    card: 'border-slate-200 bg-slate-50 text-slate-500',
    icon: '○',
  };
}

export default function PipelineStages({
  stages,
  pipelineSeconds,
  error,
}: PipelineStagesProps) {
  const stageMap = new Map<string, PipelineStage>();
  stages?.forEach((s) => stageMap.set(s.name, s));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Прогрес пайплайну (6 етапів)
          </h3>
        </div>
        {typeof pipelineSeconds === 'number' && pipelineSeconds > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Час виконання: <strong>{pipelineSeconds} с</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {DEFAULT_STAGE_ORDER.map((item) => {
          const found = stageMap.get(item.name);
          const status = found?.status ?? 'PENDING';
          const st = stageStyle(status);
          return (
            <div
              key={item.name}
              className={`rounded-lg border p-2.5 transition ${st.card}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${st.dot}`}
                >
                  {st.icon}
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase opacity-75">
                  {status}
                </span>
              </div>
              <div className="mt-1.5 text-xs font-semibold">{item.label}</div>
              <div className="mt-0.5 text-[11px] opacity-75">
                {typeof found?.ms === 'number' && found.ms > 0 ? `${found.ms} ms` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <strong>Помилка етапу пайплайну:</strong> {error}
        </div>
      )}
    </div>
  );
}
