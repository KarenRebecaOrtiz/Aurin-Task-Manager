/**
 * Animation Utilities for Task CRUD
 * Centralized Framer Motion animations
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

// Fade animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Scale animations
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleInSmall: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

// Dropdown/Popper animations
export const dropdownAnimation: Variants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

// Container animations
export const containerAnimation: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

// Slide animations
export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

export const slideInFromLeft: Variants = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// Click/Tap animations
export const clickAnimation: Variants = {
  tap: { scale: 0.98, opacity: 0.9 },
};

// Stagger children animation
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

export const transitions = {
  fast: { duration: 0.2, ease: 'easeOut' } as Transition,
  normal: { duration: 0.3, ease: 'easeInOut' } as Transition,
  slow: { duration: 0.5, ease: 'easeInOut' } as Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  springBouncy: { type: 'spring', stiffness: 400, damping: 20 } as Transition,
};

// ============================================================================
// COMPOSITE ANIMATIONS (for specific components)
// ============================================================================

// Modal/Dialog animations
export const modalAnimation = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: transitions.fast,
  },
  content: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: transitions.normal,
  },
};

// Error message animation
export const errorMessageAnimation: Variants = {
  initial: { opacity: 0, height: 0, y: -10 },
  animate: { opacity: 1, height: 'auto', y: 0 },
  exit: { opacity: 0, height: 0, y: -10 },
};

// Success/Loading state animations
export const stateAnimation: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

// Form field animation
export const fieldAnimation: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Wizard step animation
export const wizardStepAnimation: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

// Get animation with custom transition
export const withTransition = (variant: Variants, transition: Transition): Variants => {
  return {
    ...variant,
    transition,
  } as unknown as Variants;
};

// Get animation with delay
export const withDelay = (variant: Variants, delay: number): Variants => {
  const variantObj = variant as Record<string, unknown>;
  const existingTransition = variantObj.transition as Record<string, unknown> | undefined;
  return {
    ...variant,
    transition: {
      ...(existingTransition || {}),
      delay,
    },
  } as Variants;
};

// Stagger animation generator
export const createStaggerAnimation = (itemCount: number, staggerDelay: number = 0.05) => {
  return Array.from({ length: itemCount }, (_, i) => ({
    ...fadeInUp,
    transition: {
      ...transitions.normal,
      delay: i * staggerDelay,
    },
  }));
};
