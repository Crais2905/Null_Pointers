import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { BASE, getApiMode, setApiMode } from './api/client';
import DevInbox from './pages/DevInbox';
import Incident from './pages/Incident';
import Team from './pages/Team';

export default function App() {
  const [mode, setMode] = useState<'mock' | 'java'>(getApiMode());

  const toggleMode = (next: 'mock' | 'java') => {
    setApiMode(next);
    setMode(next);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-black text-white shadow-sm">
                FX
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">
                    Fixer
                  </span>
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800">
                    AI-тріаж логів v1.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  лог на вході — завдання у правильного дева на виході
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-1.5 transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Інцидент (Лог → Діагноз → Завдання)
              </NavLink>
              <NavLink
                to="/inbox"
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-1.5 transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Inbox дева
              </NavLink>
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-1.5 transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Команда & Метрики
              </NavLink>
            </nav>
          </div>

          {/* API Mode Switcher for easy testing */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Джерело даних:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => toggleMode('mock')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  mode === 'mock'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Повна локальна симуляція всіх 5 сценаріїв, черги, дедуплікації та БД у браузері"
              >
                ⚡ Інтерактивні Моки
              </button>
              <button
                type="button"
                onClick={() => toggleMode('java')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  mode === 'java'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Пряма робота з Java Spring Boot API + H2 БД (${BASE})`}
              >
                ☕ Java API + БД (:8080)
              </button>
            </div>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Incident />} />
        <Route path="/inbox" element={<DevInbox />} />
        <Route path="/team" element={<Team />} />
      </Routes>
    </div>
  );
}
