/**
 * Centralized animation definitions for data-views tables
 * Using Framer Motion variants for consistent animations across all tables
 *
 * ✅ All GSAP animations have been migrated to Framer Motion
 */

import { Variants } from 'framer-motion';

export const tableAnimations = {
  // ==================== CONTAINER & VIEW ANIMATIONS ====================

  // Container animations - used for table/kanban wrappers
  container: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.98 },
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },

  // View transition - for switching between table/kanban views
  viewTransition: {
    initial: { opacity: 0, x: 50, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.95 },
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // Fade transition - subtle view changes
  fadeTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },

  // ==================== DROPDOWN & MENU ANIMATIONS ====================

  // Dropdown animations
  dropdown: {
    initial: { opacity: 0, y: -16, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -16, scale: 0.95 },
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // Action menu animations
  actionMenu: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // ==================== BUTTON & CLICK ANIMATIONS ====================

  // Button click animation - replaces GSAP animateClick
  buttonClick: {
    scale: 0.95,
    opacity: 0.8,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  },

  // Button tap animation (for whileTap)
  buttonTap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },

  // Button hover animation (for whileHover)
  buttonHover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },

  // Filter icon pulse - when filter is active
  filterIconActive: {
    scale: 1.15,
    transition: {
      duration: 0.2,
      ease: [0.68, -0.55, 0.27, 1.55], // back.out equivalent
    },
  },

  // ==================== ROW & CARD ANIMATIONS ====================

  // Row entry animation
  rowEntry: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.2 },
  },

  // Row delete animation - replaces GSAP animateRowDelete
  rowDelete: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // Row hover animation
  rowHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    transition: { duration: 0.2 },
  },

  // Kanban card animations
  kanbanCard: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -20 },
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },

  // Kanban drag start
  kanbanDragStart: {
    scale: 1.05,
    rotate: 2,
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    transition: { duration: 0.2 },
  },

  // Kanban drag end
  kanbanDragEnd: {
    scale: 1,
    rotate: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: {
      duration: 0.3,
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },

  // ==================== NOTIFICATION ANIMATIONS ====================

  // Undo notification animations
  undoNotification: {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.9 },
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // Toast notification
  toast: {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.2 },
  },

  // ==================== INPUT & FILTER ANIMATIONS ====================

  // Search input animation - replaces GSAP search animation
  searchInputFocus: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },

  // Filter pill entry
  filterPill: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
    transition: { duration: 0.15 },
  },

  // ==================== LOADING & SKELETON ANIMATIONS ====================

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

  // Spinner rotation
  spinner: {
    animate: {
      rotate: 360,
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },

  // Pulse animation
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },

  // ==================== FADE ANIMATIONS ====================

  // Fade in - replaces GSAP animateFadeIn
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // Fade out - replaces GSAP animateFadeOut
  fadeOut: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },

  // ==================== STAGGER ANIMATIONS ====================

  // List stagger - for animating lists of items
  listStagger: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },

  // List item
  listItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  },
} as const;

export type TableAnimationType = keyof typeof tableAnimations;

/**
 * Helper function to get animation variants by name
 * Usage: const variants = getAnimationVariants('container')
 */
export const getAnimationVariants = (name: TableAnimationType): any => {
  return tableAnimations[name];
};

/**
 * Preset combinations for common animation patterns
 */
export const animationPresets = {
  // Table view mount
  tableMount: {
    ...tableAnimations.container,
  },

  // Kanban view mount
  kanbanMount: {
    ...tableAnimations.container,
  },

  // Modal open
  modalOpen: {
    ...tableAnimations.fadeTransition,
  },

  // Dropdown open
  dropdownOpen: {
    ...tableAnimations.dropdown,
  },
};
