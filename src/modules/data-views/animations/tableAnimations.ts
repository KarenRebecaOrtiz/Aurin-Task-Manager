/**
 * Centralized animation definitions for data-views tables
 * Using Framer Motion variants for consistent animations across all tables
 */

export const tableAnimations = {
  // Container animations
  container: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      opacity: { duration: 0.15 },
      scale: { duration: 0.2 },
    },
  },

  // Dropdown animations
  dropdown: {
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  // Action menu animations
  actionMenu: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.2, ease: 'power2.out' },
  },

  // Row hover animations
  rowHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Undo notification animations
  undoNotification: {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.9 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Search input animation
  searchInput: {
    scale: 1.02,
    duration: 0.2,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
  },

  // Button click animation
  buttonClick: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },

  // Loading skeleton animations
  skeleton: {
    initial: { opacity: 0.6 },
    animate: { opacity: 1 },
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatType: 'reverse' as const,
    },
  },
};

export type TableAnimationType = keyof typeof tableAnimations;
