import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { DevTask } from '../api/types';
import { severityBadgeStyle } from './IncidentQueue';

interface TaskPreviewProps {
  task?: DevTask | null;
  developerNamesById?: Record<string, string>;
}

export default function TaskPreview({
  task,
  developerNamesById = {},
}: TaskPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!task) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Прев'ю завдання розробнику (Dev Task)
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Завдання ще не створено (створюється при AUTO_DISPATCHED або після ручного Confirm).
        </p>
      </div>
    );
  }

  const assigneeLabel = developerNamesById[task.assigneeId]
    ? `${developerNamesById[task.assigneeId]} (${task.assigneeId})`
    : task.assigneeId;
  const backupLabel = task.backupId
    ? developerNamesById[task.backupId]
      ? `${developerNamesById[task.backupId]} (${task.backupId})`
      : task.backupId
    : '—';

  const handleCopyMarkdown = async () => {
    try {
      const md = await api.markdown(task.id);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(task.bodyMd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-emerald-600 px-2 py-0.5 font-mono text-xs font-bold text-white">
            TASK #{task.id}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${severityBadgeStyle(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-800">
            Повторень (occurrences): ×{task.occurrences}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
            Доставка: {task.deliveryStatus}
          </span>
          {task.status && (
            <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-800">
              Статус: {task.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? '✓ Markdown скопійовано!' : '📋 Копіювати .md'}
          </button>
          <Link
            to={`/inbox?dev=${encodeURIComponent(task.assigneeId)}`}
            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Відкрити в Inbox дева →
          </Link>
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-slate-900">{task.title}</h4>
        <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
          <span>
            <strong>Виконавець (Assignee):</strong> {assigneeLabel}
          </span>
          <span>
            <strong>Backup-кандидат:</strong> {backupLabel}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
          Тіло завдання (Markdown)
        </div>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-800">
          {task.bodyMd}
        </pre>
      </div>
    </div>
  );
}
