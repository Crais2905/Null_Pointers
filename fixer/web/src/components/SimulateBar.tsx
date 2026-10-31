import type { Scenario } from '../api/types';

interface SimulateBarProps {
  onSimulate: (scenario: Scenario) => void;
  onFillPreset?: (scenario: Scenario) => void;
  onReset: () => void;
  busy?: boolean;
}

const SCENARIOS: {
  id: Scenario;
  label: string;
  subtitle: string;
  badge: string;
  color: string;
}[] = [
  {
    id: 'DUP_CHARGE',
    label: '1. DUP_CHARGE',
    subtitle: 'Подвійне списання POST /api/pay',
    badge: 'P1 · AUTO → Андрій',
    color: 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900',
  },
  {
    id: 'DUP_CHARGE_AGAIN',
    label: '2. DUP_CHARGE_AGAIN',
    subtitle: 'Повтор того ж бага (order=402)',
    badge: 'R2 · DEDUP (x2)',
    color: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900',
  },
  {
    id: 'PROMO_NPE',
    label: '3. PROMO_NPE',
    subtitle: 'NPE у PromoService.java:88',
    badge: 'P2 · AUTO → Марія',
    color: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900',
  },
  {
    id: 'COURIER_TIMEOUT',
    label: '4. COURIER_TIMEOUT',
    subtitle: 'Timeout + 503 зовнішнього API',
    badge: 'R4 · CONFIRM → Олена',
    color: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900',
  },
  {
    id: 'AMBIGUOUS',
    label: '5. AMBIGUOUS',
    subtitle: 'Лише повільні WARN без помилки',
    badge: 'R1 · NEEDS_TRIAGE',
    color: 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800',
  },
];

export default function SimulateBar({
  onSimulate,
  onFillPreset,
  onReset,
  busy = false,
}: SimulateBarProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Демо-сценарії (Seed Logs · 1 клік)
          </h2>
          <p className="text-xs text-slate-500">
            Запускає <code className="rounded bg-slate-100 px-1 py-0.5">POST /api/incidents/simulate</code> або підставляє лог у форму для ручного тестування
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          title="POST /api/reset — очистити інциденти та завдання"
        >
          <span>↺</span> Скинути демо (Reset)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {SCENARIOS.map((s) => (
          <div
            key={s.id}
            className={`flex flex-col justify-between rounded-lg border p-2.5 transition ${s.color}`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold">{s.label}</span>
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm">
                  {s.badge}
                </span>
              </div>
              <p className="mt-1 text-xs opacity-85">{s.subtitle}</p>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSimulate(s.id)}
                className="flex-1 rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                ▶ Запустити
              </button>
              {onFillPreset && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onFillPreset(s.id)}
                  className="rounded border border-current/20 bg-white/70 px-2 py-1 text-[11px] font-medium hover:bg-white"
                  title="Заповнити форму цим логом для редагування"
                >
                  У форму
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
