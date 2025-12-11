/**
 * Data Views Animations Module
 *
 * Centralized animation definitions using Framer Motion (Motion Dev)
 * for consistent animations across all data view components.
 *
 * @module data-views/animations
 */

// ============================================================
// LEGACY EXPORTS (tableAnimations.ts)
// ============================================================

export {
  tableAnimations,
  type TableAnimationType,
  getAnimationVariants,
  animationPresets,
} from './tableAnimations';

// ============================================================
// ANIMATION HELPERS (animationHelpers.ts)
// ============================================================

export * from './animationHelpers';

// ============================================================
// ENTRY ANIMATIONS (entryAnimations.ts)
// ============================================================

export {
  // Table animations
  tableContainerVariants,
  tableBodyVariants,
  tableRowVariants,
  tableHeaderVariants,

  // Kanban animations
  kanbanBoardVariants,
  kanbanColumnVariants,
  kanbanCardVariants,
  kanbanColumnHeaderVariants,

  // Skeleton animations
  shimmerVariants,
  skeletonContainerVariants,
  skeletonRowVariants,
  skeletonCellVariants,

  // Utility functions
  createStaggerTransition,
  getRowAnimationDelay,
  withDelay,

  // Preset configurations
  entryAnimationPresets,

  // Types
  type EntryAnimationPreset,
  type TableAnimationVariants,
  type KanbanAnimationVariants,
  type SkeletonAnimationVariants,
} from './entryAnimations';
