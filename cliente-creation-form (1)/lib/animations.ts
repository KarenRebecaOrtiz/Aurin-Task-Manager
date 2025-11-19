import type { Transition, Variants } from "framer-motion"

// Transiciones base - rápidas y smooth
export const transitions = {
  // Transición rápida por defecto
  fast: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  } as Transition,
  
  // Transición suave
  smooth: {
    type: "spring",
    stiffness: 300,
    damping: 25,
  } as Transition,
  
  // Transición instantánea
  instant: {
    duration: 0.15,
    ease: "easeOut"
  } as Transition,
} as const

// Variantes de aparición
export const fadeIn: Variants = {
  hidden: { 
    opacity: 0,
  },
  visible: { 
    opacity: 1,
    transition: transitions.fast
  }
}

export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0,
    y: 10
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: transitions.fast
  }
}

export const fadeInDown: Variants = {
  hidden: { 
    opacity: 0,
    y: -10
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: transitions.fast
  }
}

// Variante para escalado
export const scaleIn: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.95
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: transitions.smooth
  }
}

// Variante para dropdowns y popovers
export const dropdownVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    y: -5
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.fast
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.instant
  }
}

// Variante para items de lista (con stagger)
export const listItemVariants: Variants = {
  hidden: { 
    opacity: 0,
    x: -10
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: transitions.fast
  }
}

export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

// Variante para modales/diálogos
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.smooth
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: transitions.instant
  }
}

// Variante para badges/chips
export const badgeVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.8
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: transitions.fast
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: transitions.instant
  }
}
