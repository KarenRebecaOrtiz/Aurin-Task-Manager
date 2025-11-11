import { Variants } from 'framer-motion';

// Animaciones para el overlay
export const overlayVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1 
  },
  exit: { 
    opacity: 0 
  },
};

// Animaciones para el modal (centro)
export const modalCenterVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9,
    y: 10
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    y: 10
  },
};

// Animaciones para el modal (top)
export const modalTopVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -50
  },
  visible: { 
    opacity: 1, 
    y: 0
  },
  exit: { 
    opacity: 0, 
    y: -50
  },
};

// Animaciones para el modal (bottom)
export const modalBottomVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 50
  },
  visible: { 
    opacity: 1, 
    y: 0
  },
  exit: { 
    opacity: 0, 
    y: 50
  },
};

// Animaciones para botones
export const buttonVariants: Variants = {
  hover: { 
    scale: 1.02 
  },
  tap: { 
    scale: 0.98 
  },
};

// Animaciones para inputs
export const inputVariants: Variants = {
  focus: { 
    scale: 1.01 
  },
};

// Animaciones para contenido interno
export const contentVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 5 
  },
  visible: { 
    opacity: 1, 
    y: 0 
  },
};

// Configuración de transiciones
export const transitions = {
  fast: { duration: 0.2, ease: 'easeOut' as const },
  normal: { duration: 0.3, ease: 'easeOut' as const },
  slow: { duration: 0.4, ease: 'easeOut' as const },
};
