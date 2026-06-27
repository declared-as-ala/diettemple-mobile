/**
 * Premium color palette for the Home screen only.
 * Use these tokens so Home has a consistent, luxurious look without changing the rest of the app.
 *
 * - Gold: primary CTA, progress ring, selected day accent, UH badge
 * - Off-white: main titles and key headings
 * - Graphite: dates, secondary line, week info, metadata
 * - Blue steel: optional subtle accents (borders, chip background)
 */
export const homeColors = {
  gold: '#D4AF37',
  offWhite: '#F3F4F6',
  graphite: '#9CA3AF',
  blueSteel: '#1F3A5F',
} as const;

/** Dim gold for selected day pill background (gold-accented but not full gold). */
export const homeColorsSelectedDayBg = 'rgba(212,175,55,0.25)';
