import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DevTask } from '../api/types';

export function useTasks(assigneeId: string) {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.tasks(assigneeId || undefined);
      setTasks(list);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [assigneeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(
    async (taskId: number, status: 'ACK' | 'DONE') => {
      const updated = await api.setTaskStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return updated;
    },
    []
  );

  return { tasks, loading, error, setError, refresh, updateStatus };
}
