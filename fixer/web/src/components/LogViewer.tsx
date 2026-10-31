import { useEffect, useRef, useState } from 'react';
import type { Evidence } from '../api/types';

interface LogViewerProps {
  rawLog?: string;
  logLines: number;
  evidence?: Evidence[];
  findingLines?: number[];
  activeLine: number | null;
  onSelectLine?: (line: number) => void;
}

export default function LogViewer({
  rawLog,
  logLines,
  evidence = [],
  findingLines = [],
  activeLine,
  onSelectLine,
}: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [filterOnlySignals, setFilterOnlySignals] = useState(false);

  const lines = rawLog ? rawLog.replace(/\n$/, '').split(/\r?\n/) : [];
  const evidenceByLine = new Map<number, Evidence>();
  evidence.forEach((ev) => evidenceByLine.set(ev.line, ev));
  const findingSet = new Set<number>(findingLines);

  useEffect(() => {
    if (activeLine != null) {
      setFilterOnlySignals(false);
      requestAnimationFrame(() => {
        const el = lineRefs.current[activeLine];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }, [activeLine]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Сирий лог ({lines.length || logLines} рядків)
          </h3>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-900 border border-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Доказ AI ({evidence.length})
            </span>
            {findingLines.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 font-medium text-sky-900 border border-sky-200">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Детектор ({findingSet.size})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {evidence.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">До рядка:</span>
              {evidence.map((ev) => (
                <button
                  key={ev.line}
                  type="button"
                  onClick={() => onSelectLine?.(ev.line)}
                  className={`rounded px-2 py-0.5 font-mono text-xs font-semibold transition ${
                    activeLine === ev.line
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  L{ev.line}
                </button>
              ))}
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={filterOnlySignals}
              onChange={(e) => setFilterOnlySignals(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Лише важливі рядки
          </label>
        </div>
      </div>

      {!rawLog ? (
        <div className="p-6 text-center text-xs text-slate-500">
          Текст логу відсутній або завантажується...
        </div>
      ) : (
        <div
          ref={containerRef}
          className="max-h-[420px] overflow-y-auto bg-slate-950 font-mono text-xs leading-relaxed text-slate-200"
        >
          {lines.map((content, idx) => {
            const lineNum = idx + 1;
            const ev = evidenceByLine.get(lineNum);
            const isFinding = findingSet.has(lineNum);
            const isError = content.includes(' ERROR ') || content.startsWith('java.lang.') || content.startsWith('\tat ');
            const isWarn = content.includes(' WARN ');
            const isFocused = activeLine === lineNum;

            if (
              filterOnlySignals &&
              !ev &&
              !isFinding &&
              !isError &&
              !isWarn
            ) {
              return null;
            }

            let rowClass = 'border-l-4 border-transparent hover:bg-slate-900/90';
            if (ev) {
              rowClass = isFocused
                ? 'border-l-4 border-amber-400 bg-amber-500/30 text-amber-50 ring-1 ring-amber-400/60'
                : 'border-l-4 border-amber-400 bg-amber-500/15 text-amber-100';
            } else if (isFinding) {
              rowClass = isFocused
                ? 'border-l-4 border-sky-400 bg-sky-500/30 text-sky-50'
                : 'border-l-4 border-sky-400 bg-sky-500/10 text-sky-100';
            } else if (isError) {
              rowClass = 'border-l-4 border-rose-500/70 bg-rose-950/30 text-rose-200';
            } else if (isWarn) {
              rowClass = 'border-l-4 border-amber-600/50 text-amber-200/90';
            }

            return (
              <div
                key={lineNum}
                ref={(el) => {
                  lineRefs.current[lineNum] = el;
                }}
                onClick={() => onSelectLine?.(lineNum)}
                className={`group flex cursor-pointer items-start px-3 py-0.5 transition ${rowClass}`}
              >
                <span className="w-10 shrink-0 select-none pr-3 text-right text-[11px] text-slate-500 group-hover:text-slate-300">
                  {lineNum}
                </span>
                <div className="flex-1 whitespace-pre-wrap break-all">
                  <span>{content}</span>
                  {ev && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-sans font-semibold text-amber-300 border border-amber-400/40">
                      {ev.verified ? '✓ Доказ підтверджено' : '⚠ Непідтверджено'} · {ev.why}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
