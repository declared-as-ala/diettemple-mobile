// Central export for all constants to ensure proper initialization
export { colors } from './colors';
export { theme } from './theme';
export { homeColors, homeColorsSelectedDayBg } from './homeColors';
export { Typography } from './typography';
export { Spacing, Radius } from './spacing';

// Re-export colors for convenience
export const COLORS = {
  BACKGROUND: '#000000',
  PRIMARY: '#D4AF37',
  TEXT: '#FFFFFF',
  TEXT_SECONDARY: '#CCCCCC',
  ERROR: '#FF0000',
  BORDER: '#333333',
  PLACEHOLDER: '#666666',
} as const;



