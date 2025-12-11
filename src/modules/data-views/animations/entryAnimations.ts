/**
 * Centralized Entry Animations for Data Views
 *
 * Smooth, performant entry animations for tables and kanban boards
 * using Motion Dev (framer-motion). These animations are isolated
 * to table containers and their rows/cards only.
 *
 * @module entryAnimations
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================
// CONFIGURATION
// ============================================================

/** Default easing curve for smooth animations */
const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

/** Spring configuration for natural motion */
const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 1,
};

/** Durations for different animation types */
const DURATIONS = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
  stagger: 0.04,
} as const;

// ============================================================
// TABLE ENTRY ANIMATIONS
// ============================================================

/**
 * Container variants for table wrapper
 * Orchestrates child animations with stagger
 */
export const tableContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
      when: 'beforeChildren',
      staggerChildren: DURATIONS.stagger,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
      ease: SMOOTH_EASE,
      when: 'afterChildren',
      staggerChildren: DURATIONS.stagger / 2,
      staggerDirection: -1,
    },
  },
};

/**
 * Table body variants - wraps all rows
 */
export const tableBodyVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.fast,
      ease: SMOOTH_EASE,
      staggerChildren: DURATIONS.stagger,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

/**
 * Row entry variants - each table row animates in
 * Subtle y translation with fade for smooth appearance
 */
export const tableRowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: DURATIONS.fast,
      ease: SMOOTH_EASE,
    },
  },
};

/**
 * Header row variants - animates before body rows
 */
export const tableHeaderVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -4,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

// ============================================================
// KANBAN ENTRY ANIMATIONS
// ============================================================

/**
 * Kanban board container variants
 * Orchestrates column animations
 */
export const kanbanBoardVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
      when: 'afterChildren',
    },
  },
};

/**
 * Kanban column variants
 * Each column fades in with slight y movement
 */
export const kanbanColumnVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.slow,
      ease: SMOOTH_EASE,
      when: 'beforeChildren',
      staggerChildren: DURATIONS.stagger,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

/**
 * Kanban card variants
 * Smooth scale + fade entry
 */
export const kanbanCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

/**
 * Kanban column header variants
 */
export const kanbanColumnHeaderVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
    },
  },
};

// ============================================================
// SKELETON LOADER ANIMATIONS
// ============================================================

/**
 * Shimmer animation for skeleton loaders
 * Smooth horizontal sweep effect
 */
export const shimmerVariants: Variants = {
  animate: {
    x: ['-100%', '100%'],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Skeleton container variants - matches real table structure
 */
export const skeletonContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
      when: 'beforeChildren',
      staggerChildren: DURATIONS.stagger,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

/**
 * Skeleton row variants
 */
export const skeletonRowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 4,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.fast,
      ease: SMOOTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

/**
 * Skeleton cell variants
 */
export const skeletonCellVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Creates stagger configuration for list items
 * @param itemCount - Number of items to animate
 * @param baseDelay - Starting delay in seconds
 * @returns Transition configuration
 */
export const createStaggerTransition = (
  itemCount: number,
  baseDelay: number = 0
): Transition => ({
  duration: DURATIONS.normal,
  ease: SMOOTH_EASE,
  staggerChildren: Math.max(0.02, DURATIONS.stagger - (itemCount * 0.002)),
  delayChildren: baseDelay,
});

/**
 * Get row animation with custom delay based on index
 * Useful for dynamic lists
 * @param index - Row index
 * @param totalRows - Total number of rows (optional, for optimization)
 */
export const getRowAnimationDelay = (
  index: number,
  totalRows?: number
): number => {
  // Reduce stagger for large lists to prevent long animation times
  const staggerTime = totalRows && totalRows > 20
    ? DURATIONS.stagger / 2
    : DURATIONS.stagger;
  return index * staggerTime;
};

/**
 * Creates custom variants with specific delay
 * @param baseVariants - Base animation variants
 * @param delay - Additional delay to add
 */
export const withDelay = (
  baseVariants: Variants,
  delay: number
): Variants => {
  return {
    ...baseVariants,
    visible: {
      ...baseVariants.visible,
      transition: {
        ...(typeof baseVariants.visible === 'object' && 'transition' in baseVariants.visible
          ? baseVariants.visible.transition
          : {}),
        delay,
      },
    },
  };
};

// ============================================================
// ANIMATION PRESET CONFIGURATIONS
// ============================================================

/**
 * Ready-to-use animation configurations for common scenarios
 */
export const entryAnimationPresets = {
  /** Fast, subtle entry for data-heavy tables */
  tableQuick: {
    container: tableContainerVariants,
    header: tableHeaderVariants,
    body: tableBodyVariants,
    row: tableRowVariants,
  },

  /** Standard kanban board animation */
  kanbanStandard: {
    board: kanbanBoardVariants,
    column: kanbanColumnVariants,
    columnHeader: kanbanColumnHeaderVariants,
    card: kanbanCardVariants,
  },

  /** Skeleton loader animation set */
  skeleton: {
    container: skeletonContainerVariants,
    row: skeletonRowVariants,
    cell: skeletonCellVariants,
    shimmer: shimmerVariants,
  },
} as const;

// ============================================================
// TYPE EXPORTS
// ============================================================

export type EntryAnimationPreset = keyof typeof entryAnimationPresets;
export type TableAnimationVariants = typeof entryAnimationPresets.tableQuick;
export type KanbanAnimationVariants = typeof entryAnimationPresets.kanbanStandard;
export type SkeletonAnimationVariants = typeof entryAnimationPresets.skeleton;
