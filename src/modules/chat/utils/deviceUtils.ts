/**
 * Chat Utils - Device Detection
 */

import { useState, useEffect } from 'react';

/**
 * Detecta si el dispositivo es móvil basado en el ancho de pantalla
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Hook para detectar cambios en el tamaño de pantalla
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isMobileDevice();
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// Re-export para compatibilidad
export { isMobileDevice as isMobile };
