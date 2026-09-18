import type { SetLog } from '../services/workoutProgressStorage';

export interface ResumePositionResult {
  exerciseIndex: number;
  setIndex: number;
  isAllComplete: boolean;
  completedExerciseIndices: number[];
}

/**
 * Deterministically computes the exact exercise and set where the workout should resume.
 *
 * Algorithm:
 * - Scans each exercise in order (0 to items.length - 1).
 * - Counts how many sets have `completed === true`.
 * - If `completedSetsCount < targetSets`:
 *     We stop at this exercise!
 *     Inside this exercise, we find the first incomplete set (`findIndex(s => !s?.completed)`).
 *     This is the exact resume position.
 * - If `completedSetsCount >= targetSets`:
 *     This exercise is fully complete and must NEVER be reopened as active.
 * - If all exercises are complete:
 *     Returns `isAllComplete = true`.
 */
export function findFirstIncompletePosition(
  items: Array<{ sets?: number; exerciseId?: any }>,
  setLogs: Record<number, SetLog[]>
): ResumePositionResult {
  if (!items || items.length === 0) {
    return { exerciseIndex: 0, setIndex: 0, isAllComplete: false, completedExerciseIndices: [] };
  }

  const completedExerciseIndices: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const targetSets = Number(items[i]?.sets) || 3;
    const logs = setLogs[i] ?? [];
    const completedSetsCount = logs.filter((s) => s?.completed).length;

    if (completedSetsCount >= targetSets && targetSets > 0) {
      completedExerciseIndices.push(i);
    } else {
      // First incomplete exercise found!
      const firstIncompleteSetIdx = logs.findIndex((s) => !s?.completed);
      const setIndex =
        firstIncompleteSetIdx >= 0
          ? firstIncompleteSetIdx
          : Math.min(completedSetsCount, targetSets - 1);
      return {
        exerciseIndex: i,
        setIndex: Math.max(0, setIndex),
        isAllComplete: false,
        completedExerciseIndices,
      };
    }
  }

  // All exercises are complete!
  return {
    exerciseIndex: Math.max(0, items.length - 1),
    setIndex: 0,
    isAllComplete: true,
    completedExerciseIndices,
  };
}
