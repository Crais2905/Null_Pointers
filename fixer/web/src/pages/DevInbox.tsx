import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Developer, DevTask } from '../api/types';
import { severityBadgeStyle } from '../components/IncidentQueue';
import TaskList, { taskStatusBadge } from '../components/TaskList';
import { useTasks } from '../hooks/useTasks';

function renderBodyWithIncidentLinks(bodyMd: string) {
  // Шукаємо посилання виду /?incidentId=12 або [#12](/?incidentId=12)
  const regex = /\[([^\]]+)\]\(\/\?incidentId=(\d+)\)|(\/\?incidentId=(\d+))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bodyMd)) !== null) {
    if (match.index > lastIndex) {
      parts.push(bodyMd.slice(lastIndex, match.index));
    }
    const label = match[1] ?? match[3];
    const incId = match[2] ?? match[4];
    parts.push(
      <Link
        key={`${match.index}-${incId}`}
        to={`/?incidentId=${incId}`}
        className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-xs font-bold text-indigo-800 underline hover:bg-indigo-200"
      >
        {label} ↗
      </Link>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < bodyMd.length) {
    parts.push(bodyMd.slice(lastIndex));
  }

  return parts;
}

export default function DevInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDev = searchParams.get('dev') ?? 'dev-1';

  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [selectedDevId, setSelectedDevId] = useState<string>(initialDev);
  const { tasks, loading, error, setError, refresh, updateStatus } =
    useTasks(selectedDevId);

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [busyStatus, setBusyStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .developers()
      .then((devs) => {
        setDevelopers(devs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      setSelectedTaskId((prev) =>
        prev != null && tasks.some((t) => t.id === prev) ? prev : tasks[0].id
      );
    } else {
      setSelectedTaskId(null);
    }
  }, [tasks]);

  const developerNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    developers.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  }, [developers]);

  const selectedTask: DevTask | null = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const handleSelectDev = (devId: string) => {
    setSelectedDevId(devId);
    if (devId) {
      setSearchParams({ dev: devId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleStatusChange = async (status: 'ACK' | 'DONE') => {
    if (!selectedTask) return;
    setBusyStatus(true);
    setError('');
    try {
      await updateStatus(selectedTask.id, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyStatus(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!selectedTask) return;
    try {
      const md = await api.markdown(selectedTask.id);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(selectedTask.bodyMd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = async () => {
    if (!selectedTask) return;
    try {
      const md = await api.markdown(selectedTask.id);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-${selectedTask.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 space-y-4">
      {/* Header & Developer Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Inbox розробника (Dev Tasks)
          </h1>
          <p className="text-xs text-slate-500">
            Перегляд призначених завдань із верифікованими доказами, підтвердження взяття в роботу (ACK), закриття (DONE) та експорт Markdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectDev('')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                selectedDevId === ''
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Усі розробники
            </button>
            {developers.map((dev) => {
              const active = selectedDevId === dev.id;
              return (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => handleSelectDev(dev.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {dev.name}{' '}
                  <span className="opacity-75 font-mono text-[10px]">
                    ({dev.role})
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {loading ? 'Оновлення...' : '↻ Оновити'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
        >
          ⚠ {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Task List */}
        <div className="lg:col-span-4">
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={(t) => setSelectedTaskId(t.id)}
            developerNamesById={developerNamesById}
          />
        </div>

        {/* Right: Task Details */}
        <div className="lg:col-span-8">
          {!selectedTask ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-sm">
              Оберіть завдання ліворуч для перегляду деталей.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                      TASK #{selectedTask.id}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${severityBadgeStyle(
                        selectedTask.priority
                      )}`}
                    >
                      {selectedTask.priority}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${taskStatusBadge(
                        selectedTask.status ?? 'OPEN'
                      )}`}
                    >
                      {selectedTask.status ?? 'OPEN'}
                    </span>
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                      Повторень бага (occurrences): ×{selectedTask.occurrences}
                    </span>
                  </div>

                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    {selectedTask.title}
                  </h2>

                  <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-600">
                    <span>
                      <strong>Виконавець:</strong>{' '}
                      {developerNamesById[selectedTask.assigneeId] ??
                        selectedTask.assigneeId}{' '}
                      (<code>{selectedTask.assigneeId}</code>)
                    </span>
                    {selectedTask.backupId && (
                      <span>
                        <strong>Backup:</strong>{' '}
                        {developerNamesById[selectedTask.backupId] ??
                          selectedTask.backupId}{' '}
                        (<code>{selectedTask.backupId}</code>)
                      </span>
                    )}
                    <span>
                      <strong>Статус доставки:</strong>{' '}
                      <code>{selectedTask.deliveryStatus}</code>
                    </span>
                  </div>
                </div>

                {/* Action buttons: ACK / DONE / Markdown */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      busyStatus ||
                      selectedTask.status === 'ACK' ||
                      selectedTask.status === 'DONE'
                    }
                    onClick={() => handleStatusChange('ACK')}
                    className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-40"
                    title="Взяти в роботу (PATCH /api/tasks/{id} -> ACK)"
                  >
                    👋 Взяти в роботу (ACK)
                  </button>

                  <button
                    type="button"
                    disabled={busyStatus || selectedTask.status === 'DONE'}
                    onClick={() => handleStatusChange('DONE')}
                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40"
                    title="Закрити завдання (PATCH /api/tasks/{id} -> DONE)"
                  >
                    ✓ Виконано (DONE)
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copied ? '✓ Скопійовано!' : '📋 Копіювати Markdown'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ⬇ .md
                  </button>
                </div>
              </div>

              {/* Markdown Body with clickable /?incidentId=... link */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Повний опис завдання з доказами та критеріями приймання
                  </span>
                  {selectedTask.incidentId && (
                    <Link
                      to={`/?incidentId=${selectedTask.incidentId}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Перейти до інциденту #{selectedTask.incidentId} →
                    </Link>
                  )}
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-800">
                  {renderBodyWithIncidentLinks(selectedTask.bodyMd)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
