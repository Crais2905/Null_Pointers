import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Incident, IncidentStatus } from '../api/types';

const POLLING_STATUSES: IncidentStatus[] = ['NEW', 'ANALYZING', 'DIAGNOSED'];

export function isPollingStatus(status?: IncidentStatus): boolean {
  return Boolean(status && POLLING_STATUSES.includes(status));
}

export function useIncident(
  incidentId: number | null,
  onStatusFinalized?: (inc: Incident) => void
) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchIncident = useCallback(
    async (id: number, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await api.getIncident(id);
        setIncident(data);
        setError('');
        if (!isPollingStatus(data.status) && onStatusFinalized) {
          onStatusFinalized(data);
        }
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [onStatusFinalized]
  );

  useEffect(() => {
    if (incidentId == null) {
      setIncident(null);
      setError('');
      return;
    }
    fetchIncident(incidentId, false);
  }, [incidentId, fetchIncident]);

  useEffect(() => {
    if (incidentId == null || !incident) return;
    if (!isPollingStatus(incident.status)) return;

    const timer = window.setInterval(() => {
      fetchIncident(incidentId, true);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [incidentId, incident, fetchIncident]);

  return {
    incident,
    setIncident,
    loading,
    error,
    setError,
    refresh: () => (incidentId != null ? fetchIncident(incidentId, false) : Promise.resolve(null)),
    isPolling: isPollingStatus(incident?.status),
  };
}
