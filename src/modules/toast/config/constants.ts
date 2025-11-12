/**
 * Toast Configuration Constants
 */

export const TOAST_DEFAULTS = {
  DURATION: 5000,
  POSITION: 'top-right' as const,
  PLAY_SOUND: true,
};

export const TOAST_AUDIO_FILES = {
  success: '/Success.mp3',
  error: '/Error.mp3',
  warning: '/Warning.mp3',
  info: '/Info.mp3',
} as const;

export const TOAST_LABELS = {
  success: 'Éxito',
  error: 'Error',
  warning: 'Advertencia',
  info: 'Información',
} as const;

export const TOAST_POSITIONS = [
  'top-right',
  'top-center',
  'top-left',
  'bottom-right',
  'bottom-center',
  'bottom-left',
] as const;

export const ANIMATION_DURATION = 300; // ms
