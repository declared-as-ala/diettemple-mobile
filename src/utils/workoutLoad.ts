export type ExerciseLoadMode = 'external_weight' | 'bodyweight' | 'bodyweight_plus_weight';

export const LOAD_MODE_LABELS: Record<ExerciseLoadMode, string> = {
  external_weight: 'Charge externe',
  bodyweight: 'Poids du corps',
  bodyweight_plus_weight: 'Poids du corps + charge',
};

export function supportedLoadModes(exercise?: {
  supportedLoadModes?: ExerciseLoadMode[];
} | null): ExerciseLoadMode[] {
  return exercise?.supportedLoadModes?.length ? exercise.supportedLoadModes : ['external_weight'];
}

export function defaultLoadMode(exercise?: {
  supportedLoadModes?: ExerciseLoadMode[];
  defaultLoadMode?: ExerciseLoadMode;
} | null): ExerciseLoadMode {
  const supported = supportedLoadModes(exercise);
  return exercise?.defaultLoadMode && supported.includes(exercise.defaultLoadMode)
    ? exercise.defaultLoadMode
    : supported[0];
}

export function formatSetLoad(load?: {
  loadMode?: ExerciseLoadMode;
  weightKg?: number;
  externalWeightKg?: number;
  additionalWeightKg?: number;
} | null): string {
  const formatKg = (value: number) => Number(value.toFixed(2)).toLocaleString('fr-FR');
  const mode = load?.loadMode ?? 'external_weight';
  if (mode === 'bodyweight') return 'Poids du corps';
  if (mode === 'bodyweight_plus_weight') {
    return `Poids du corps + ${formatKg(Number(load?.additionalWeightKg ?? load?.weightKg ?? 0))} kg`;
  }
  return `${formatKg(Number(load?.externalWeightKg ?? load?.weightKg ?? 0))} kg`;
}
