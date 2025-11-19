import { Variants, Transition } from 'framer-motion';

// Unified transition timings - smooth and fast
export const transitions = {
  ultraFast: {
    duration: 0.1,
    ease: [0.32, 0.72, 0, 1], // Custom cubic-bezier for smooth feel
  } as Transition,
  fast: {
    duration: 0.15,
    ease: [0.32, 0.72, 0, 1], // Custom cubic-bezier for smooth feel
  } as Transition,
  normal: {
    duration: 0.2,
    ease: [0.32, 0.72, 0, 1],
  } as Transition,
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  } as Transition,
};

// Backdrop animations
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

// Panel animations - smooth scale and fade
export const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
};

// Content stagger animations
export const contentVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Individual item animations
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 4,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

// Button hover/tap animations
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
  },
  tap: {
    scale: 0.98,
  },
};
