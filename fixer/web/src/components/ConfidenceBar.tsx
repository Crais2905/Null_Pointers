interface ConfidenceBarProps {
  llmConfidence?: number | null;
  finalConfidence?: number | null;
}

export default function ConfidenceBar({
  llmConfidence,
  finalConfidence,
}: ConfidenceBarProps) {
  const conf = finalConfidence ?? llmConfidence ?? 0;
  const pct = Math.round(conf * 100);
  const llmPct = llmConfidence != null ? Math.round(llmConfidence * 100) : null;

  let barColor = 'bg-rose-500';
  let textColor = 'text-rose-700';
  let zoneText = '< 0.50 · Низька (NEEDS_TRIAGE)';

  if (conf >= 0.75) {
    barColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
    zoneText = '≥ 0.75 · Висока (Авто-відправка R5)';
  } else if (conf >= 0.5) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700';
    zoneText = '0.50–0.74 · Середня (Очікує підтвердження R4)';
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Впевненість (Final Confidence):</span>
          <span className={`font-mono text-sm font-bold ${textColor}`}>
            {conf.toFixed(2)} ({pct}%)
          </span>
          {llmPct != null && llmConfidence !== finalConfidence && (
            <span className="text-[11px] text-slate-500">
              (LLM до калібрування: {llmConfidence?.toFixed(2)})
            </span>
          )}
        </div>
        <span className={`text-[11px] font-medium ${textColor}`}>{zoneText}</span>
      </div>

      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
        {/* Позначки порогів 50% та 75% */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-600/50"
          style={{ left: '50%' }}
          title="Поріг 0.50 (R1 / R4)"
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800/60"
          style={{ left: '75%' }}
          title="Поріг 0.75 (R4 / R5)"
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
        <span>0.0</span>
        <span>0.50 (Triage)</span>
        <span>0.75 (Auto)</span>
        <span>1.0</span>
      </div>
    </div>
  );
}
