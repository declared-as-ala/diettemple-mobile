import { useMemo } from 'react';
import type { SetLog } from '../services/workoutProgressStorage';

export function useWorkoutProgress(
  items: Array<{ sets?: number }>,
  setLogs: Record<number, SetLog[]>,
  manualUnlockedIndex = 0
) {
  return useMemo(() => {
    let computedUnlocked = 0;
    const maxIndex = Math.max(0, items.length - 1);

    for (let i = 0; i < maxIndex; i += 1) {
      const targetSets = Number(items[i]?.sets) || 3;
      const logs = setLogs[i] ?? [];
      const completedSets = logs.filter((s) => s?.completed).length;

      if (completedSets >= targetSets && targetSets > 0) {
        computedUnlocked = i + 1;
      } else {
        break;
      }
    }

    const maxUnlockedIndex = Math.min(
      maxIndex,
      Math.max(computedUnlocked, manualUnlockedIndex)
    );

    return { maxUnlockedIndex };
  }, [items, setLogs, manualUnlockedIndex]);
}
