import type { Decision } from '../api/types';

interface DecisionBadgeProps {
  decision?: Decision | null;
  dedupOf?: number | null;
  onSelectIncident?: (id: number) => void;
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  R1: 'R1 · 0 валідних доказів, або category = UNKNOWN, або final_confidence < 0.50 → NEEDS_TRIAGE',
  R2: 'R2 · Є відкрите завдання з тим самим SHA-1 fingerprint → DEDUPLICATED (occurrences + 1)',
  R3: 'R3 · Немає компетентного кандидата зі score ≥ 40 → NEEDS_TRIAGE (немає власника)',
  R4: 'R4 · Помірна впевненість (0.50 ≤ final_confidence < 0.75) → PENDING_CONFIRM',
  R5: 'R5 · Висока впевненість (≥ 0.75) + тумблер autoDispatch увімкнений → AUTO_DISPATCHED',
  R6: 'R6 · Висока впевненість (≥ 0.75) + тумблер autoDispatch вимкнений → PENDING_CONFIRM',
};

export default function DecisionBadge({
  decision,
  dedupOf,
  onSelectIncident,
}: DecisionBadgeProps) {
  if (!decision) return null;

  let boxStyle = 'border-slate-200 bg-slate-50 text-slate-900';
  if (decision.outcome === 'AUTO_DISPATCHED') {
    boxStyle = 'border-emerald-300 bg-emerald-50/80 text-emerald-950';
  } else if (decision.outcome === 'PENDING_CONFIRM') {
    boxStyle = 'border-amber-300 bg-amber-50/80 text-amber-950';
  } else if (decision.outcome === 'NEEDS_TRIAGE') {
    boxStyle = 'border-orange-300 bg-orange-50/80 text-orange-950';
  } else if (decision.outcome === 'DEDUPLICATED') {
    boxStyle = 'border-purple-300 bg-purple-50/80 text-purple-950';
  } else if (decision.outcome === 'DISMISSED') {
    boxStyle = 'border-slate-300 bg-slate-100 text-slate-700';
  }

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${boxStyle}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-75">
            Рішення політики відправки:
          </span>
          <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
            Правило {decision.rule}
          </span>
          <span className="rounded-md bg-white/80 px-2.5 py-0.5 font-mono text-xs font-bold shadow-sm">
            {decision.outcome}
          </span>
        </div>

        {dedupOf != null && (
          <button
            type="button"
            onClick={() => onSelectIncident?.(dedupOf)}
            className="rounded-lg border border-purple-400 bg-white px-2.5 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100"
          >
            Дублікат інциденту #{dedupOf} →
          </button>
        )}
      </div>

      <p className="mt-2 text-sm font-medium">{decision.reason}</p>
      {RULE_DESCRIPTIONS[decision.rule] && (
        <p className="mt-1 text-xs opacity-75">{RULE_DESCRIPTIONS[decision.rule]}</p>
      )}
    </div>
  );
}
