import { useEffect, useState } from 'react';
import type { Candidate, Developer, IncidentStatus } from '../api/types';

interface ActionBarProps {
  incidentId: number;
  status: IncidentStatus;
  candidates: Candidate[];
  developers: Developer[];
  onConfirm: (assigneeId?: string) => Promise<void>;
  onDismiss: () => Promise<void>;
  busy?: boolean;
}

export default function ActionBar({
  status,
  candidates,
  developers,
  onConfirm,
  onDismiss,
  busy = false,
}: ActionBarProps) {
  const defaultAssignee = candidates[0]?.developerId ?? developers.find((d) => d.available)?.id ?? '';
  const [assigneeId, setAssigneeId] = useState<string>(defaultAssignee);

  useEffect(() => {
    if (candidates[0]?.developerId) {
      setAssigneeId(candidates[0].developerId);
    } else if (!assigneeId && developers.length > 0) {
      const firstAvail = developers.find((d) => d.available);
      if (firstAvail) setAssigneeId(firstAvail.id);
    }
  }, [candidates, developers, assigneeId]);

  const canConfirm = status === 'PENDING_CONFIRM' || status === 'NEEDS_TRIAGE';
  const canDismiss =
    status !== 'AUTO_DISPATCHED' &&
    status !== 'DEDUPLICATED' &&
    status !== 'DISMISSED';

  if (!canConfirm && !canDismiss) {
    return null;
  }

  const isReassign =
    status === 'PENDING_CONFIRM' &&
    candidates[0]?.developerId &&
    assigneeId !== candidates[0].developerId;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
            Дії оператора (Human-in-the-loop)
          </h3>
          <p className="text-xs text-indigo-800">
            {status === 'NEEDS_TRIAGE'
              ? 'Система не впевнена в діагнозі (NEEDS_TRIAGE). Оберіть розробника вручну або відхиліть інцидент як не-баг.'
              : status === 'PENDING_CONFIRM'
              ? 'Завдання сформовано і чекає вашого підтвердження. Можна відправити рекомендованому кандидату або змінити виконавця.'
              : 'Ви можете закрити цей інцидент як не-баг (Dismiss).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConfirm && (
            <>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={busy}
                className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="" disabled>
                  — Оберіть розробника —
                </option>
                {developers.map((dev) => {
                  const candScore = candidates.find((c) => c.developerId === dev.id)?.score;
                  return (
                    <option key={dev.id} value={dev.id} disabled={!dev.available}>
                      {dev.name} ({dev.role})
                      {candScore != null ? ` · ${candScore} балів` : ''}
                      {!dev.available ? ' [Недоступний]' : ''}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                disabled={busy || (status === 'NEEDS_TRIAGE' && !assigneeId)}
                onClick={() => onConfirm(assigneeId || undefined)}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {status === 'NEEDS_TRIAGE'
                  ? 'Призначити вручну →'
                  : isReassign
                  ? 'Підтвердити з іншим виконавцем (Reassign) →'
                  : '✓ Підтвердити і відправити (Confirm)'}
              </button>
            </>
          )}

          {canDismiss && (
            <button
              type="button"
              disabled={busy}
              onClick={onDismiss}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              ✕ Не баг (Dismiss)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
