/**
 * Animation Constants
 * Framer Motion animation configurations for consistent animations
 */

export const TODO_ANIMATIONS = {
  // Dropdown animations
  dropdown: {
    hidden: {
      desktop: { opacity: 0, y: -10, scale: 0.95 },
      mobile: { y: '100%', opacity: 0 },
    },
    visible: {
      desktop: { opacity: 1, y: 0, scale: 1 },
      mobile: { y: '0%', opacity: 1 },
    },
    exit: {
      desktop: { opacity: 0, y: -10, scale: 0.95 },
      mobile: { y: '100%', opacity: 0 },
    },
  },

  // Overlay animations
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Header animations
  header: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.1, duration: 0.3 },
  },

  // Content animations
  content: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { delay: 0.2, duration: 0.3 },
  },

  // Empty state animations
  emptyState: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 },
  },

  // Todo item animations
  todoItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20, height: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' },
  },

  // Button animations
  button: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
  },

  // Error message animations
  errorMessage: {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.2 },
  },

  // Loading state animations
  loadingState: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },

  // Error state animations
  errorState: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 },
  },

  // Transitions
  transitions: {
    desktop: {
      duration: 0.2,
      ease: 'easeOut',
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
    mobile: {
      duration: 0.3,
      ease: 'easeInOut',
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
} as const;
