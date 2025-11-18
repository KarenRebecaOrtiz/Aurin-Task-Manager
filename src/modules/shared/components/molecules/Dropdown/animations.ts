/**
 * Animaciones centralizadas para componentes Dropdown
 * Reutilizable en todos los dropdowns de la aplicación
 */

import { easeOut } from 'framer-motion';

export const dropdownAnimations = {
  // Animación del menú (entrada/salida)
  menu: {
    initial: { opacity: 0, y: -12, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 0.95 },
    transition: { duration: 0.15, ease: easeOut },
  },

  // Animación de items individuales con stagger
  item: (index: number) => ({
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.12, delay: index * 0.03 },
  }),

  // Animación del trigger (botón que abre el dropdown)
  trigger: {
    initial: { scale: 1 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.1 },
  },
};
