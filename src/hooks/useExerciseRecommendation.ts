import { useCallback, useEffect, useRef, useState } from 'react';
import { ExerciseRecommendation, workoutService } from '../services/workoutService';

const cache = new Map<string, ExerciseRecommendation>();

interface State {
  data: ExerciseRecommendation | null;
  loading: boolean;
  error: string | null;
}

export function useExerciseRecommendation(exerciseId?: string, exerciseName?: string) {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null });
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!exerciseId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    if (cache.has(exerciseId)) {
      setState({ data: cache.get(exerciseId) || null, loading: false, error: null });
      return;
    }

    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const recommendation = await workoutService.getExerciseRecommendation(exerciseId, exerciseName);
      cache.set(exerciseId, recommendation);
      if (requestIdRef.current === requestId) {
        setState({ data: recommendation, loading: false, error: null });
      }
    } catch (error: any) {
      if (requestIdRef.current === requestId) {
        setState({ data: null, loading: false, error: error?.message || 'recommendation_failed' });
      }
    }
  }, [exerciseId, exerciseName]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

