/**
 * Premium Nutrition page: dark luxury theme with gold/yellow accents.
 * Matches reference design (gold CTA, dark cards, macro accent colors).
 */
export const nutritionColors = {
  /** Background: deep black with optional subtle glow */
  background: '#0A0A0B',
  /** Card: dark glossy */
  card: '#151518',
  cardBorder: 'rgba(255,255,255,0.06)',
  /** Gold CTA and primary accent */
  gold: '#D4AF37',
  goldDim: 'rgba(212,175,55,0.15)',
  /** Text */
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  /** Macro accents (reference: gold/orange/green) */
  protein: '#D4AF37',
  carbs: '#F97316',
  fat: '#22C55E',
  /** Progress track */
  track: 'rgba(255,255,255,0.1)',
  /** Shadow for cards */
  shadow: 'rgba(0,0,0,0.4)',
} as const;
