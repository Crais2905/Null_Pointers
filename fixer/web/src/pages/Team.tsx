import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Developer, Metrics, ModuleCatalogItem } from '../api/types';
import AutoDispatchToggle from '../components/AutoDispatchToggle';
import MetricsBar from '../components/MetricsBar';

export default function Team() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [modules, setModules] = useState<ModuleCatalogItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [autoDispatch, setAutoDispatch] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [devs, mods, met, sett] = await Promise.all([
        api.developers(),
        api.modules().catch(() => [] as ModuleCatalogItem[]),
        api.metrics(),
        api.settings(),
      ]);
      setDevelopers(devs);
      setModules(mods);
      setMetrics(met);
      setAutoDispatch(sett.autoDispatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggleAutoDispatch = async (nextVal: boolean) => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.putSettings({ autoDispatch: nextVal });
      setAutoDispatch(updated.autoDispatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Команда, Каталог модулів та Політика відправки
          </h1>
          <p className="text-xs text-slate-500">
            Детермінований реєстр розробників і модулів (seed YAML) та операційні метрики пайплайну
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ↻ Оновити метрики
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
        >
          ⚠ {error}
        </div>
      )}

      {/* Metrics Block */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Операційні метрики пайплайну (GET /api/metrics)
        </h2>
        <MetricsBar metrics={metrics} />
      </section>

      {/* AutoDispatch Toggle */}
      <section>
        <AutoDispatchToggle
          autoDispatch={autoDispatch}
          onChange={handleToggleAutoDispatch}
          busy={busy}
        />
      </section>

      {/* Developers Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Реєстр розробників ({developers.length})
            </h2>
            <p className="text-xs text-slate-500">
              Скоринг маршрутизації: +50 за модуль (+10 якщо primary), +10 за кожну навичку (макс +30), −5 за відкрите завдання (крім P1). Компетентний поріг ≥ 40.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">ID / Розробник</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Власник модулів (ownedModules)</th>
                <th className="px-4 py-3">Навички (skills)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {developers.map((dev) => (
                <tr key={dev.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{dev.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {dev.id} {dev.handle ? `· ${dev.handle}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      {dev.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        dev.available
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          dev.available ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      {dev.available ? 'Доступний' : 'Недоступний'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {dev.ownedModules.map((m) => (
                        <span
                          key={`${dev.id}-${m.id}`}
                          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                            m.level === 'primary'
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                              : 'border-slate-300 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.id}{' '}
                          <span className="opacity-75">({m.level})</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {dev.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Module Catalog Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Каталог модулів системи ({modules.length})
          </h2>
          <p className="text-xs text-slate-500">
            Передається в LLM при кожному аналізі логу; AI може обрати suspected_module_id лише з цього списку або повернути null
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">ID модуля</th>
                <th className="px-4 py-3">Назва</th>
                <th className="px-4 py-3">Опис</th>
                <th className="px-4 py-3">Ключові слова (keywords)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((mod) => (
                <tr key={mod.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-900">
                    {mod.id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {mod.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{mod.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {mod.keywords?.map((kw) => (
                        <span
                          key={kw}
                          className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
