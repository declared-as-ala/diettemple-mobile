/**
 * Session-scoped exercise selection / duplicate resolution.
 *
 * Each slot has an immutable definition (primary + alternatives) coming from the program
 * template. The client's explicit picks are kept separately as `selections` (slot index ->
 * exercise id). The effective exercise of every slot is DERIVED from both, so nothing is
 * ever mutated: changing a pick back automatically restores displaced exercises, and the
 * template / other clients are never affected.
 *
 * Rules:
 *  - Explicit picks (and slots already performed, passed as `locked`) always win.
 *  - Every other slot takes the first of [primary, ...alternatives] not already in use,
 *    walking slots in program order. This chains (A->B, B->C, C->D ...).
 *  - If a slot has no unused candidate (e.g. a duplicate with no alternatives), it keeps its
 *    primary: the duplication is then considered intentional.
 */

export type SlotDef<T extends { _id: string }> = { primary: T; alternatives: T[] };

export function slotCandidates<T extends { _id: string }>(slot: SlotDef<T>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of [slot.primary, ...(slot.alternatives || [])]) {
    if (c && c._id && !seen.has(c._id)) {
      seen.add(c._id);
      out.push(c);
    }
  }
  return out;
}

/** Returns the new selections after the client picks `exerciseId` for `slotIndex`. */
export function applyExplicitSelection<T extends { _id: string }>(
  selections: Record<number, string>,
  slots: SlotDef<T>[],
  slotIndex: number,
  exerciseId: string
): Record<number, string> {
  const next: Record<number, string> = { ...selections };
  const slot = slots[slotIndex];
  if (!slot) return next;
  if (exerciseId === slot.primary._id) {
    delete next[slotIndex]; // back to the template default: lets displaced slots return
  } else {
    next[slotIndex] = exerciseId;
  }
  // The same exercise can't be explicitly held by two slots: the older pick is released.
  for (const key of Object.keys(next)) {
    const idx = Number(key);
    if (idx !== slotIndex && next[idx] === exerciseId) delete next[idx];
  }
  return next;
}

/** Effective exercise for every slot. Pure and deterministic. */
export function resolveEffectiveExercises<T extends { _id: string }>(
  slots: SlotDef<T>[],
  selections: Record<number, string> = {},
  locked: Record<number, string> = {}
): T[] {
  const result: (T | undefined)[] = new Array(slots.length).fill(undefined);
  const used = new Set<string>();

  // 1) Fixed slots: performed (locked) first, then explicit picks.
  slots.forEach((slot, i) => {
    const wanted = locked[i] ?? selections[i];
    if (!wanted) return;
    const found = slotCandidates(slot).find((c) => c._id === wanted);
    if (found) {
      result[i] = found;
      used.add(found._id);
    }
  });

  // 2) Remaining slots in program order.
  slots.forEach((slot, i) => {
    if (result[i]) return;
    const cands = slotCandidates(slot);
    const pick = cands.find((c) => !used.has(c._id)) ?? slot.primary;
    result[i] = pick;
    used.add(pick._id);
  });

  return result as T[];
}
