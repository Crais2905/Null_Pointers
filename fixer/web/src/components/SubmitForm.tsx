import { useEffect, useState } from 'react';
import type { CreateIncidentRequest } from '../api/types';

interface SubmitFormProps {
  onSubmitJson: (payload: CreateIncidentRequest) => Promise<void>;
  onSubmitFile: (formData: FormData) => Promise<void>;
  preset?: {
    userMessage: string;
    log: string;
    orderId: number | null;
    userId: number | null;
  } | null;
  busy?: boolean;
}

export default function SubmitForm({
  onSubmitJson,
  onSubmitFile,
  preset,
  busy = false,
}: SubmitFormProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [userMessage, setUserMessage] = useState('');
  const [logText, setLogText] = useState('');
  const [orderId, setOrderId] = useState('');
  const [userId, setUserId] = useState('');
  const [complaintAt, setComplaintAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (preset) {
      setOpen(true);
      setMode('text');
      setUserMessage(preset.userMessage);
      setLogText(preset.log);
      setOrderId(preset.orderId != null ? String(preset.orderId) : '');
      setUserId(preset.userId != null ? String(preset.userId) : '');
      setLocalError('');
    }
  }, [preset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (mode === 'file') {
      if (!file) {
        setLocalError('Оберіть файл .log, .txt або .json');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      if (userMessage.trim()) fd.append('userMessage', userMessage.trim());
      if (orderId.trim()) fd.append('orderId', orderId.trim());
      if (userId.trim()) fd.append('userId', userId.trim());
      if (complaintAt.trim()) fd.append('complaintAt', complaintAt.trim());
      await onSubmitFile(fd);
      return;
    }

    if (!logText.trim()) {
      setLocalError('Вставте текст логу або завантажте файл');
      return;
    }

    await onSubmitJson({
      userMessage: userMessage.trim() || 'Скарга користувача (без опису)',
      log: logText,
      orderId: orderId.trim() ? Number(orderId.trim()) : null,
      userId: userId.trim() ? Number(userId.trim()) : null,
      complaintAt: complaintAt.trim() || null,
    });
  };

  const handleFilePreview = async (selected: File | null) => {
    setFile(selected);
    if (selected) {
      try {
        const preview = await selected.text();
        setLogText(preview);
      } catch {
        // ignore preview failure
      }
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            +
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Новий інцидент (Вставка логу або завантаження файлу .log / .txt / .json)
            </h2>
            <p className="text-xs text-slate-500">
              POST /api/incidents · підтримує JSON або multipart/form-data з полями order_id / user_id
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {open ? 'Згорнути ▲' : 'Розгорнути форму ▼'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 p-4 space-y-3">
          {localError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {localError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Скарга користувача (userMessage)
              </label>
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Напр.: Мене списали двічі за замовлення 318"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Order ID (необов'язково)
              </label>
              <input
                type="number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="318"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                User ID (необов'язково)
              </label>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="77"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  mode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Вставити текст логу
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  mode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Файл (.log / .txt / .json)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Час скарги (ISO):</label>
              <input
                type="text"
                value={complaintAt}
                onChange={(e) => setComplaintAt(e.target.value)}
                placeholder="2026-10-31T12:30:00Z"
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'file' ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <input
                type="file"
                accept=".log,.txt,.json"
                onChange={(e) => handleFilePreview(e.target.files?.[0] ?? null)}
                className="text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
              />
              {file && (
                <p className="mt-2 text-xs text-slate-600">
                  Вибрано файл: <span className="font-semibold">{file.name}</span> ({file.size} байт)
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Сирий лог ({logText ? logText.split(/\r?\n/).length : 0} рядків)
                </label>
                {logText && (
                  <button
                    type="button"
                    onClick={() => setLogText('')}
                    className="text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    Очистити лог
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="2026-10-31T12:30:01.410Z INFO [payment-service] trace=t101 request_id=a1 POST /api/pay order=318 -> 200..."
                className="w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? 'Відправка...' : 'Надіслати на AI-тріаж →'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
