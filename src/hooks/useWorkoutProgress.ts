import { useMemo } from 'react';
import type { SetLog } from '../services/workoutProgressStorage';

export function useWorkoutProgress(
  items: Array<{ sets?: number }>,
  setLogs: Record<number, SetLog[]>
) {
  return useMemo(() => {
    let maxUnlockedIndex = 0;
    for (let i = 0; i < items.length - 1; i += 1) {
      const targetSets = items[i]?.sets ?? 3;
      const logs = setLogs[i] ?? [];
      const completedSets = logs.filter((s) => s?.completed).length;
      if (completedSets >= targetSets) {
        maxUnlockedIndex = i + 1;
      } else {
        break;
      }
    }
    return { maxUnlockedIndex };
  }, [items, setLogs]);
}
