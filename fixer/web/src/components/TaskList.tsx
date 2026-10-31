import type { DevTask } from '../api/types';
import { severityBadgeStyle } from './IncidentQueue';

interface TaskListProps {
  tasks: DevTask[];
  selectedTaskId: number | null;
  onSelectTask: (task: DevTask) => void;
  developerNamesById?: Record<string, string>;
}

export function taskStatusBadge(status?: string) {
  switch (status) {
    case 'ACK':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'DONE':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    default:
      return 'bg-sky-100 text-sky-800 border-sky-200';
  }
}

export default function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  developerNamesById = {},
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-sm">
        У цього розробника поки немає призначених завдань.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {tasks.map((task) => {
        const isSelected = task.id === selectedTaskId;
        const st = task.status ?? 'OPEN';
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelectTask(task)}
            className={`w-full text-left p-4 transition ${
              isSelected
                ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-700">
                  TASK #{task.id}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${severityBadgeStyle(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                  ×{task.occurrences} повторень
                </span>
              </div>

              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${taskStatusBadge(
                  st
                )}`}
              >
                {st}
              </span>
            </div>

            <p className="mt-1.5 text-sm font-bold text-slate-900">{task.title}</p>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Виконавець:{' '}
                <strong>
                  {developerNamesById[task.assigneeId] ?? task.assigneeId}
                </strong>
              </span>
              <span className="font-mono text-[11px]">
                Доставка: {task.deliveryStatus}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
