import { colors } from './colors';

export { colors };

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      color: colors.text,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: colors.textSecondary,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

