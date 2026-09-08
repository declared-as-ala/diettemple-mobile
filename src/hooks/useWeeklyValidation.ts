import { useCallback, useEffect, useState } from 'react';
import { meService, WeeklyValidationResponse } from '../services/meService';

export function useWeeklyValidation(enabled: boolean, date?: string) {
  const [data, setData] = useState<WeeklyValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await meService.getWeeklyValidation(date);
      setData(response);
    } catch (e: any) {
      setError(e?.message || 'weekly_validation_failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, date]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

