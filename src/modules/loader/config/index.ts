/**
 * Loader Module Configuration
 * 
 * This file contains configuration constants for the loader module
 */

export const LOADER_CONFIG = {
  // Animation durations in milliseconds
  ANIMATION: {
    FADE_DURATION: 300,
    EXIT_DURATION: 800,
    PROGRESS_DURATION: 2000,
  },
  
  // Timing for lighthouse animations
  LIGHTHOUSE: {
    GLOW_LIGHT_TIMING: 6000,
    LIGHT_TIMING: 6000,
    OCEAN_LAYER_TIMING: 4000,
  },
  
  // Z-index values
  Z_INDEX: {
    FULL_PAGE: 9999,
    CONTENT: 2,
    BACKGROUND: 1,
  },
} as const;

export type LoaderConfig = typeof LOADER_CONFIG;

// Re-export types
export * from './types';
