// Safe color access utility
// Use this when colors might be undefined during module initialization

import { colors } from '../constants/colors';

export const getColor = (key: keyof typeof colors): string => {
  if (!colors || !colors[key]) {
    // Fallback colors
    const fallbacks: Record<string, string> = {
      background: '#000000',
      primary: '#D4AF37',
      text: '#FFFFFF',
      textSecondary: '#CCCCCC',
      error: '#FF0000',
      border: '#333333',
      placeholder: '#666666',
    };
    return fallbacks[key as string] || '#000000';
  }
  return colors[key];
};

// Direct color constants for StyleSheet.create
export const COLORS = {
  BACKGROUND: '#000000',
  PRIMARY: '#00FF00',
  TEXT: '#FFFFFF',
  TEXT_SECONDARY: '#CCCCCC',
  ERROR: '#FF0000',
  BORDER: '#333333',
  PLACEHOLDER: '#666666',
} as const;



