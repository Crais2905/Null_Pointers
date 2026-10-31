interface AutoDispatchToggleProps {
  autoDispatch: boolean;
  onChange: (nextValue: boolean) => Promise<void>;
  busy?: boolean;
}

export default function AutoDispatchToggle({
  autoDispatch,
  onChange,
  busy = false,
}: AutoDispatchToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Тумблер автоматичної відправки (autoDispatch)
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              autoDispatch
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {autoDispatch ? 'УВІМКНЕНО (R5 активне)' : 'ВИМКНЕНО (усе через R6 Confirm)'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Коли увімкнено, інциденти з високою впевненістю (<strong>final_confidence ≥ 0.75</strong>) і компетентним власником модуля автоматично створюють завдання в Inbox розробника. Коли вимкнено — усі завдання чекають ручного підтвердження людини.
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(!autoDispatch)}
        role="switch"
        aria-checked={autoDispatch}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
          autoDispatch ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            autoDispatch ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
