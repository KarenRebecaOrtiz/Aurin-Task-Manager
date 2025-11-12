/**
 * Constantes relacionadas con el theme toggler
 */

export const THEME_TOGGLER_VARIANTS = {
  DEFAULT: 'default',
  DROPDOWN: 'dropdown',
  COMPACT: 'compact',
} as const;

export const THEME_TOGGLER_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;

export const THEME_TOGGLER_ANIMATIONS = {
  HOVER_SCALE: 1.02,
  TAP_SCALE: 0.98,
  TRANSITION_DURATION: 0.3,
  HOVER_DURATION: 0.12,
  TAP_DURATION: 0.08,
} as const;

export const THEME_TOGGLER_DIMENSIONS = {
  DEFAULT: {
    WIDTH: 60,
    HEIGHT: 30,
    BORDER_RADIUS: 15,
  },
  DROPDOWN: {
    WIDTH: 48,
    HEIGHT: 24,
    BORDER_RADIUS: 12,
  },
  COMPACT: {
    WIDTH: 40,
    HEIGHT: 20,
    BORDER_RADIUS: 10,
  },
} as const;

export type ThemeTogglerVariant = typeof THEME_TOGGLER_VARIANTS[keyof typeof THEME_TOGGLER_VARIANTS];
export type ThemeTogglerSize = typeof THEME_TOGGLER_SIZES[keyof typeof THEME_TOGGLER_SIZES];
