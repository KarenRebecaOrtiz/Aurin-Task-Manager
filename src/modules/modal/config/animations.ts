import { Variants } from 'framer-motion';

/**
 * Transitions predefinidas para consistencia - OPTIMIZADAS PARA VELOCIDAD
 */
export const transitions = {
  ultraFast: { duration: 0.1, ease: [0.16, 1, 0.3, 1] as const }, // Cubic bezier para suavidad
  fast: { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const },
  normal: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  slow: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

/**
 * Variantes para el overlay del modal - MUY RÁPIDO
 */
export const overlayVariants: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: transitions.ultraFast
  },
  exit: {
    opacity: 0,
    transition: transitions.ultraFast
  },
};

/**
 * Variantes para el contenido del modal (posición central) - RÁPIDO Y SUAVE
 */
export const modalCenterVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.fast
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: transitions.ultraFast
  },
};

/**
 * Variantes para el contenido del modal (posición superior)
 */
export const modalTopVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    y: -50,
    transition: transitions.normal
  },
};

/**
 * Variantes para el contenido del modal (posición inferior)
 */
export const modalBottomVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal
  },
  exit: {
    opacity: 0,
    y: 50,
    transition: transitions.normal
  },
};

/**
 * Variantes para botones dentro del modal
 */
export const buttonVariants: Variants = {
  hover: { 
    scale: 1.02 
  },
  tap: { 
    scale: 0.98 
  },
};

/**
 * Variantes para inputs dentro del modal
 */
export const inputVariants: Variants = {
  focus: { 
    scale: 1.01 
  },
};

/**
 * Variantes para contenido interno del modal (fade in) - CON STAGGER
 */
export const contentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 4
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast
  },
};

/**
 * Variantes para contenedor con stagger (para animar hijos secuencialmente)
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02, // 20ms entre cada hijo - MUY RÁPIDO pero visible
      delayChildren: 0.05, // Pequeño delay antes de empezar
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.01,
      staggerDirection: -1, // Reversa en salida
    },
  },
};

/**
 * Variantes para items individuales con stagger
 */
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 3,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
  exit: {
    opacity: 0,
    y: -3,
    transition: transitions.ultraFast,
  },
};