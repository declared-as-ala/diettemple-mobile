// Define colors object first
const colorsObject = {
  background: '#000000',
  primary: '#D4AF37', // Gold accent
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  error: '#FF0000',
  border: '#333333',
  placeholder: '#666666',
};

// Export with type safety
export const colors: typeof colorsObject = colorsObject;

// Also export individual colors as constants for direct use
export const COLORS = {
  BACKGROUND: '#000000',
  PRIMARY: '#00FF00',
  TEXT: '#FFFFFF',
  TEXT_SECONDARY: '#CCCCCC',
  ERROR: '#FF0000',
  BORDER: '#333333',
  PLACEHOLDER: '#666666',
} as const;

