import type { Metrics } from '../api/types';

interface MetricsBarProps {
  metrics?: Metrics | null;
}

export default function MetricsBar({ metrics }: MetricsBarProps) {
  const m = metrics ?? {
    avgPipelineSec: 0,
    autoDispatchedPercent: 0,
    dedupMerged: 0,
    total: 0,
  };

  const cards = [
    {
      label: 'Всього інцидентів (Total)',
      value: String(m.total),
      sub: 'Оброблено системою Fixer',
      accent: 'border-slate-200 bg-white text-slate-900',
    },
    {
      label: 'Середній час пайплайну',
      value: `${m.avgPipelineSec} с`,
      sub: 'Мета ТЗ: ≈ 10 с (детектори + 1 виклик LLM)',
      accent: 'border-indigo-200 bg-indigo-50/50 text-indigo-950',
    },
    {
      label: 'Частка авто-відправлених',
      value: `${m.autoDispatchedPercent}%`,
      sub: 'Статус AUTO_DISPATCHED (правило R5)',
      accent: 'border-emerald-200 bg-emerald-50/50 text-emerald-950',
    },
    {
      label: "Об'єднані дублікати (Dedup)",
      value: String(m.dedupMerged),
      sub: 'Запобігання спаму однаковими тасками (R2)',
      accent: 'border-purple-200 bg-purple-50/50 text-purple-950',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border p-4 shadow-sm ${c.accent}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider opacity-75">
            {c.label}
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold">{c.value}</div>
          <div className="mt-1 text-[11px] opacity-75">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
