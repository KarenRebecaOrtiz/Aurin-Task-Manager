/**
 * Chat Sidebar Animations Module
 *
 * Centralized smooth animations for ChatSidebar open/close transitions
 * using Motion Dev (framer-motion). These animations provide buttery
 * smooth entry and exit effects with proper synchronization.
 *
 * @module chat/animations
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================
// CONFIGURATION - SMOOTH & REFINED
// ============================================================

/**
 * Custom smooth easing - feels natural and premium
 * Based on Material Design's emphasized decelerate
 */
const SMOOTH_EASE = [0.2, 0.0, 0.0, 1.0] as const;

/**
 * Entrance easing - quick start, smooth landing
 * Creates anticipation and satisfaction
 */
const ENTRANCE_EASE = [0.0, 0.0, 0.2, 1.0] as const;

/**
 * Exit easing - smooth start, quick end
 * Feels responsive when closing
 */
const EXIT_EASE = [0.4, 0.0, 1.0, 1.0] as const;

/**
 * Spring configuration for organic motion
 */
const SPRING_SMOOTH = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 0.8,
};

/** Durations for different animation phases */
const DURATIONS = {
  fast: 0.25,
  normal: 0.4,
  slow: 0.5,
  overlay: 0.35,
  content: 0.45,
  exit: 0.3,
} as const;

// ============================================================
// SIDEBAR CONTAINER ANIMATIONS
// ============================================================

/**
 * Main sidebar container variants
 * Slides in from right with smooth deceleration
 */
export const sidebarContainerVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0.5,
    scale: 0.98,
  },
  visible: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      },
      opacity: {
        duration: DURATIONS.normal,
        ease: SMOOTH_EASE,
      },
      scale: {
        duration: DURATIONS.normal,
        ease: SMOOTH_EASE,
      },
      when: 'beforeChildren',
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    scale: 0.98,
    transition: {
      x: {
        type: 'spring',
        stiffness: 400,
        damping: 35,
        mass: 0.6,
      },
      opacity: {
        duration: DURATIONS.exit,
        ease: EXIT_EASE,
      },
      scale: {
        duration: DURATIONS.exit,
        ease: EXIT_EASE,
      },
      when: 'afterChildren',
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/**
 * Alternative sidebar animation - simpler slide
 * Use this for performance on lower-end devices
 */
export const sidebarSlideVariants: Variants = {
  hidden: {
    x: '100%',
  },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    },
  },
};

// ============================================================
// OVERLAY ANIMATIONS
// ============================================================

/**
 * Backdrop overlay variants
 * Smooth fade with slight blur animation
 */
export const overlayVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(4px)',
    transition: {
      opacity: {
        duration: DURATIONS.overlay,
        ease: SMOOTH_EASE,
      },
      backdropFilter: {
        duration: DURATIONS.slow,
        ease: SMOOTH_EASE,
      },
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      opacity: {
        duration: DURATIONS.exit,
        ease: EXIT_EASE,
      },
      backdropFilter: {
        duration: DURATIONS.exit,
        ease: EXIT_EASE,
      },
    },
  },
};

// ============================================================
// SIDEBAR CONTENT ANIMATIONS
// ============================================================

/**
 * Header section variants
 * Slides down with smooth fade
 */
export const sidebarHeaderVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -15,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(2px)',
    transition: {
      duration: DURATIONS.fast,
      ease: EXIT_EASE,
    },
  },
};

/**
 * Content/messages area variants
 * Fades in with subtle scale
 */
export const sidebarContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: SMOOTH_EASE,
      delay: 0.08,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: {
      duration: DURATIONS.fast,
      ease: EXIT_EASE,
    },
  },
};

/**
 * Input area variants
 * Slides up from bottom with spring
 */
export const sidebarInputVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 25,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      delay: 0.12,
    },
  },
  exit: {
    opacity: 0,
    y: 15,
    filter: 'blur(2px)',
    transition: {
      duration: DURATIONS.fast,
      ease: EXIT_EASE,
    },
  },
};

// ============================================================
// MOBILE DRAWER ANIMATIONS
// ============================================================

/**
 * Mobile drawer container variants
 * Slides up from bottom with bounce
 */
export const drawerContainerVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0.8,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 28,
      mass: 0.8,
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    },
  },
};

/**
 * Drawer content section variants
 */
export const drawerContentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
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
// IMAGE PREVIEW ANIMATIONS
// ============================================================

/**
 * Image preview overlay variants
 * Smooth fade with scale on image
 */
export const imagePreviewOverlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.fast,
      ease: SMOOTH_EASE,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
      ease: EXIT_EASE,
    },
  },
};

/**
 * Image preview content variants
 */
export const imagePreviewContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    filter: 'blur(5px)',
    transition: {
      duration: DURATIONS.fast,
      ease: EXIT_EASE,
    },
  },
};

// ============================================================
// MESSAGE ANIMATIONS
// ============================================================

/**
 * New message entry variants
 * Subtle slide up with fade
 */
export const messageEntryVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: DURATIONS.fast,
    },
  },
};

// ============================================================
// COMBINED WRAPPER FOR LAYOUT-LEVEL ANIMATEPRESENCE
// ============================================================

/**
 * Wrapper variants for use with external AnimatePresence
 * This is the main animation set when AnimatePresence is in layout.tsx
 */
export const chatSidebarWrapperVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.01,
      when: 'beforeChildren',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.exit,
      ease: EXIT_EASE,
      when: 'afterChildren',
    },
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get custom transition for sidebar based on direction
 */
export const getSidebarTransition = (direction: 'enter' | 'exit'): Transition => {
  if (direction === 'enter') {
    return {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    };
  }
  return {
    type: 'spring',
    stiffness: 400,
    damping: 35,
  };
};

/**
 * Create delayed variants for staggered animations
 */
export const withDelay = (baseVariants: Variants, delay: number): Variants => ({
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
});

// ============================================================
// PRESET CONFIGURATIONS
// ============================================================

/**
 * Ready-to-use animation configurations
 */
export const sidebarAnimationPresets = {
  /** Desktop sidebar (slide from right) - full featured */
  desktop: {
    container: sidebarContainerVariants,
    overlay: overlayVariants,
    header: sidebarHeaderVariants,
    content: sidebarContentVariants,
    input: sidebarInputVariants,
  },

  /** Desktop sidebar - simple slide only */
  desktopSimple: {
    container: sidebarSlideVariants,
    overlay: overlayVariants,
    header: sidebarHeaderVariants,
    content: sidebarContentVariants,
    input: sidebarInputVariants,
  },

  /** Mobile drawer (slide from bottom) */
  mobile: {
    container: drawerContainerVariants,
    overlay: overlayVariants,
    content: drawerContentVariants,
  },

  /** Image preview lightbox */
  imagePreview: {
    overlay: imagePreviewOverlayVariants,
    content: imagePreviewContentVariants,
  },

  /** Individual message */
  message: {
    entry: messageEntryVariants,
  },

  /** Wrapper for layout-level AnimatePresence */
  wrapper: {
    container: chatSidebarWrapperVariants,
  },
} as const;

// ============================================================
// TYPE EXPORTS
// ============================================================

export type SidebarAnimationPreset = keyof typeof sidebarAnimationPresets;
export type DesktopSidebarVariants = typeof sidebarAnimationPresets.desktop;
export type MobileSidebarVariants = typeof sidebarAnimationPresets.mobile;

// Re-export for backwards compatibility
export const sidebarScaleVariants = sidebarContainerVariants;
