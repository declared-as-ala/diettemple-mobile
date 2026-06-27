/**
 * Build the `session` object expected by SessionReels from a /home/session API document.
 */
export function buildReelsSessionFromApiSession(s: any) {
  if (!s) return null;
  const items =
    s.items ??
    (s.exerciseConfigs ?? []).map((c: any) => ({
      exerciseId: c.exerciseId ?? c,
      alternatives: c.alternatives ?? [],
      sets: c.sets ?? 3,
      reps: c.targetReps ?? '10',
      restSeconds: 60,
      order: c.order ?? 0,
    }));
  if (items.length === 0 && s.exercises?.length) {
    return {
      _id: s._id,
      title: s.title,
      durationMinutes: s.duration ?? s.durationMinutes,
      difficulty: s.difficulty,
      items: s.exercises.map((ex: any) => ({
        exerciseId: typeof ex === 'object' ? ex : { _id: ex, name: '', muscleGroup: '', videoUrl: '' },
        alternatives: [],
        sets: ex.sets ?? 3,
        reps: ex.targetReps ?? '10',
        restSeconds: 60,
        order: 0,
      })),
    };
  }
  return {
    _id: s._id,
    title: s.title,
    durationMinutes: s.duration ?? s.durationMinutes,
    difficulty: s.difficulty,
    items: items.length ? items : [],
  };
}
