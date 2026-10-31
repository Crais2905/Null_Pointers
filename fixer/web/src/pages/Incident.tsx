import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type {
  CreateIncidentRequest,
  Developer,
  IncidentSummary,
  Scenario,
} from '../api/types';
import ActionBar from '../components/ActionBar';
import AuditTimeline from '../components/AuditTimeline';
import CandidateList from '../components/CandidateList';
import DecisionBadge from '../components/DecisionBadge';
import DiagnosisCard from '../components/DiagnosisCard';
import FindingsList from '../components/FindingsList';
import IncidentQueue, { statusBadgeStyle } from '../components/IncidentQueue';
import LogViewer from '../components/LogViewer';
import PipelineStages from '../components/PipelineStages';
import SimulateBar from '../components/SimulateBar';
import SubmitForm from '../components/SubmitForm';
import TaskPreview from '../components/TaskPreview';
import { useIncident } from '../hooks/useIncident';

export default function Incident() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryIncidentId = searchParams.get('incidentId');

  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    queryIncidentId ? Number(queryIncidentId) : null
  );
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [preset, setPreset] = useState<{
    userMessage: string;
    log: string;
    orderId: number | null;
    userId: number | null;
  } | null>(null);

  const loadList = useCallback(async (autoSelectFirst = false) => {
    try {
      const list = await api.listIncidents();
      setIncidents(list);
      if (autoSelectFirst && list.length > 0) {
        setSelectedId((prev) => (prev != null ? prev : list[0].id));
      }
      return list;
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, []);

  const handleStatusFinalized = useCallback(() => {
    loadList(false);
  }, [loadList]);

  const {
    incident,
    setIncident,
    loading: incidentLoading,
    error: incidentError,
    isPolling,
  } = useIncident(selectedId, handleStatusFinalized);

  // Sync URL ?incidentId=...
  useEffect(() => {
    if (queryIncidentId) {
      const parsed = Number(queryIncidentId);
      if (!Number.isNaN(parsed) && parsed !== selectedId) {
        setSelectedId(parsed);
      }
    }
  }, [queryIncidentId, selectedId]);

  useEffect(() => {
    loadList(!queryIncidentId);
    api
      .developers()
      .then(setDevelopers)
      .catch(() => {});
  }, [loadList, queryIncidentId]);

  const selectIncident = (id: number) => {
    setSelectedId(id);
    setActiveLine(null);
    setSearchParams({ incidentId: String(id) }, { replace: true });
  };

  const handleSimulate = async (scenario: Scenario) => {
    setBusyAction(true);
    setBannerError('');
    try {
      const accepted = await api.simulate(scenario);
      await loadList(false);
      selectIncident(accepted.id);
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(false);
    }
  };

  const handleFillPreset = (scenario: Scenario) => {
    const sample = api.getSamplePreset(scenario);
    setPreset({ ...sample });
  };

  const handleSubmitJson = async (payload: CreateIncidentRequest) => {
    setBusyAction(true);
    setBannerError('');
    try {
      const accepted = await api.createIncident(payload);
      await loadList(false);
      selectIncident(accepted.id);
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(false);
    }
  };

  const handleSubmitFile = async (formData: FormData) => {
    setBusyAction(true);
    setBannerError('');
    try {
      const accepted = await api.uploadIncident(formData);
      await loadList(false);
      selectIncident(accepted.id);
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(false);
    }
  };

  const handleConfirm = async (assigneeId?: string) => {
    if (!incident) return;
    setBusyAction(true);
    setBannerError('');
    try {
      const updated = await api.confirm(incident.id, assigneeId);
      setIncident(updated);
      await loadList(false);
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(false);
    }
  };

  const handleDismiss = async () => {
    if (!incident) return;
    setBusyAction(true);
    setBannerError('');
    try {
      const updated = await api.dismiss(incident.id);
      setIncident(updated);
      await loadList(false);
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(false);
    }
  };

  const handleReset = async () => {
    setBusyAction(true);
    setBannerError('');
    try {
      await api.reset();
      // Згідно ТЗ: "Reset видаляє інциденти й задачі, тому після нього очищай вибір і перечитуй списки. Не прив'язуйся до постійних id."
      setSelectedId(null);
      setIncident(null);
      setActiveLine(null);
      setSearchParams({}, { replace: true });
      const freshList = await api.listIncidents();
      setIncidents(freshList);
      if (freshList.length > 0) {
        selectIncident(freshList[0].id);
      }
    } catch (e) {
      setBannerError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAction(false);
    }
  };

  const developerNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    developers.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  }, [developers]);

  const findingLines = useMemo(() => {
    if (!incident?.findings) return [];
    return incident.findings.flatMap((f) => f.line_numbers);
  }, [incident]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 space-y-4">
      {/* Top: Demo scenarios & Submit form */}
      <SimulateBar
        onSimulate={handleSimulate}
        onFillPreset={handleFillPreset}
        onReset={handleReset}
        busy={busyAction}
      />

      <SubmitForm
        onSubmitJson={handleSubmitJson}
        onSubmitFile={handleSubmitFile}
        preset={preset}
        busy={busyAction}
      />

      {(bannerError || incidentError) && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 shadow-sm"
        >
          <span>⚠ {bannerError || incidentError}</span>
          <button
            type="button"
            onClick={() => setBannerError('')}
            className="ml-4 text-rose-600 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main split: Queue on left, Incident details on right */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <IncidentQueue
            incidents={incidents}
            selectedId={selectedId}
            onSelect={selectIncident}
            onRefresh={() => loadList(false)}
          />
        </div>

        <div className="lg:col-span-9 space-y-4">
          {!incident ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto max-w-md space-y-2">
                <h2 className="text-base font-bold text-slate-800">
                  {incidentLoading
                    ? 'Завантаження інциденту...'
                    : 'Інцидент не вибрано'}
                </h2>
                <p className="text-xs text-slate-500">
                  Оберіть інцидент у черзі ліворуч або натисніть одну з кнопок демо-сценаріїв зверху (наприклад,{' '}
                  <strong>DUP_CHARGE</strong> чи <strong>PROMO_NPE</strong>), щоб запустити AI-тріаж.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Incident Header */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        Інцидент #{incident.id}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          statusBadgeStyle(incident.status).classes
                        }`}
                      >
                        {statusBadgeStyle(incident.status).label}
                      </span>
                      {isPolling && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
                          <span className="h-2 w-2 animate-ping rounded-full bg-indigo-600" />
                          Опитування (1 с)...
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-base font-semibold text-slate-900">
                      «{incident.userMessage}»
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {incident.orderId != null && (
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
                        order_id: <strong>{incident.orderId}</strong>
                      </span>
                    )}
                    {incident.userId != null && (
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
                        user_id: <strong>{incident.userId}</strong>
                      </span>
                    )}
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">
                      рядків: <strong>{incident.logLines}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 6 Pipeline Stages */}
              <PipelineStages
                stages={incident.stages ?? []}
                pipelineSeconds={incident.pipelineSeconds}
                error={incident.error}
              />

              {/* Decision Policy Banner (R1 - R6) */}
              <DecisionBadge
                decision={incident.decision}
                dedupOf={incident.dedupOf}
                onSelectIncident={selectIncident}
              />

              {/* Human Action Bar (Confirm / Reassign / Dismiss) */}
              <ActionBar
                incidentId={incident.id}
                status={incident.status}
                candidates={incident.candidates ?? []}
                developers={developers}
                onConfirm={handleConfirm}
                onDismiss={handleDismiss}
                busy={busyAction}
              />

              {/* Log Viewer with Evidence Highlighting */}
              <LogViewer
                rawLog={incident.rawLog}
                logLines={incident.logLines}
                evidence={incident.diagnosis?.evidence ?? []}
                findingLines={findingLines}
                activeLine={activeLine}
                onSelectLine={(ln) => setActiveLine(ln)}
              />

              {/* Diagnosis & Findings Grid */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-7 space-y-4">
                  <DiagnosisCard failed={incident.status === 'FAILED'}
                    diagnosis={incident.diagnosis}
                    llmConfidence={incident.llmConfidence}
                    finalConfidence={incident.finalConfidence}
                    onJumpToLine={(ln) => setActiveLine(ln)}
                    activeLine={activeLine}
                  />
                </div>

                <div className="xl:col-span-5 space-y-4">
                  <FindingsList
                    findings={incident.findings ?? []}
                    onJumpToLine={(ln) => setActiveLine(ln)}
                  />
                  <CandidateList
                    candidates={incident.candidates ?? []}
                  />
                </div>
              </div>

              {/* Generated DevTask Preview */}
              <TaskPreview
                task={incident.task}
                developerNamesById={developerNamesById}
              />

              {/* Audit Log Timeline */}
              <AuditTimeline auditLog={incident.auditLog ?? []} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
