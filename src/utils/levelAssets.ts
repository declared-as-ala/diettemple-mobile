import { ImageSourcePropType } from 'react-native';

/** Canonical tiers (matches `assets/level/*.png`). */
export type TierName = 'Intiate' | 'Fighter' | 'Champion' | 'Elite';
/** Includes legacy API value `Warrior` (same image as Fighter). */
export type LevelKey = TierName | 'Warrior';

const LEVEL_IMAGES: Record<TierName, ImageSourcePropType> = {
  Intiate: require('../../assets/level/Intiate.png'),
  Fighter: require('../../assets/level/Fighter.png'),
  Champion: require('../../assets/level/Champion.png'),
  Elite: require('../../assets/level/Elite.png'),
};

export function normalizeTierName(raw?: string | null): TierName {
  const s = (raw ?? '').trim();
  if (!s) return 'Intiate';
  const lower = s.toLowerCase();
  if (lower === 'initiate' || lower === 'intiate') return 'Intiate';
  if (lower === 'fighter' || lower === 'warrior') return 'Fighter';
  if (lower === 'champion') return 'Champion';
  if (lower === 'elite') return 'Elite';
  return 'Intiate';
}

export function getLevelImageSource(level: LevelKey | string | undefined | null): ImageSourcePropType {
  return LEVEL_IMAGES[normalizeTierName(level == null ? '' : String(level))];
}

export function getLevelDisplayName(level: LevelKey | string | undefined | null): string {
  return normalizeTierName(level == null ? '' : String(level));
}
