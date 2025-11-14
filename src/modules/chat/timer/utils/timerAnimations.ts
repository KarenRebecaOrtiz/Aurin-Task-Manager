/**
 * Timer Module - Animaciones Reutilizables
 *
 * Animaciones centralizadas basadas en Framer Motion
 * Inspiradas en el patrón de /src/modules/shared/components/molecules/Dropdown/animations.ts
 */

import type { Variants } from 'framer-motion';

/**
 * Animaciones para el TimerPanel (slide desde la derecha)
 */
export const timerPanelAnimations = {
  initial: { x: '100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1], // easeOut
    }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1], // easeIn
    }
  }
};

/**
 * Animaciones para backdrop/overlay
 */
export const backdropAnimations = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

/**
 * Animaciones para dialog/modal
 */
export const dialogAnimations = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  }
};

/**
 * Animación para items que aparecen (collapse/expand)
 */
export const collapseAnimations = {
  initial: {
    opacity: 0,
    height: 0,
    overflow: 'hidden'
  },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: { duration: 0.3, ease: 'easeOut' },
      opacity: { duration: 0.2, delay: 0.1 }
    }
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.25, ease: 'easeIn' },
      opacity: { duration: 0.15 }
    }
  }
};

/**
 * Animación para items de lista con stagger
 */
export const listItemAnimations = (index: number) => ({
  initial: { opacity: 0, y: -8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.15,
      delay: index * 0.05
    }
  }
});

/**
 * Animación pulse para indicadores
 */
export const pulseAnimations: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * Animación para botones (scale)
 */
export const buttonAnimations = {
  initial: { scale: 1 },
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.1 }
};

/**
 * Animación de fade in/out simple
 */
export const fadeAnimations = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

/**
 * Animación de slide down (para formularios que expanden)
 */
export const slideDownAnimations = {
  initial: {
    opacity: 0,
    y: -10,
    height: 0
  },
  animate: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    height: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};
