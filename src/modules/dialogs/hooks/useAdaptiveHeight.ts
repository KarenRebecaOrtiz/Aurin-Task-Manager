'use client';

import { useEffect, useState, useCallback, RefObject } from 'react';

interface UseAdaptiveHeightOptions {
  /**
   * Umbral del viewport height (en porcentaje, ej: 0.3 = 30%)
   * Si el contenido excede este porcentaje, el dialog ocupará el alto completo
   * @default 0.3
   */
  threshold?: number;
  
  /**
   * Si está habilitado el comportamiento adaptativo
   * @default true
   */
  enabled?: boolean;
}

interface UseAdaptiveHeightReturn {
  /**
   * Si el contenido excede el umbral del viewport
   */
  isExpanded: boolean;
  
  /**
   * Clase CSS a aplicar según el estado
   */
  heightClass: 'expandedHeight' | 'contentHeight';
  
  /**
   * Función para forzar el recálculo
   */
  recalculate: () => void;
}

/**
 * Hook para manejar la altura adaptativa de dialogs
 * 
 * Si el contenido supera el umbral (30% del viewport por defecto),
 * el dialog ocupará el alto completo disponible.
 * Si no, solo tendrá el alto necesario para su contenido.
 * 
 * @param contentRef - Referencia al elemento que contiene el contenido
 * @param options - Opciones de configuración
 */
export function useAdaptiveHeight(
  contentRef: RefObject<HTMLElement | null>,
  options: UseAdaptiveHeightOptions = {}
): UseAdaptiveHeightReturn {
  const { threshold = 0.3, enabled = true } = options;
  
  const [isExpanded, setIsExpanded] = useState(false);

  const recalculate = useCallback(() => {
    if (!enabled || !contentRef.current) {
      setIsExpanded(false);
      return;
    }

    const viewportHeight = window.innerHeight;
    const thresholdHeight = viewportHeight * threshold;
    const contentHeight = contentRef.current.scrollHeight;

    // Si el contenido excede el umbral, expandir
    setIsExpanded(contentHeight > thresholdHeight);
  }, [contentRef, threshold, enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsExpanded(false);
      return;
    }

    // Calcular en el próximo frame para asegurar que el DOM esté listo
    const timeoutId = setTimeout(recalculate, 0);

    // Recalcular en resize
    const handleResize = () => {
      recalculate();
    };

    window.addEventListener('resize', handleResize);

    // Observer para detectar cambios en el contenido
    const resizeObserver = new ResizeObserver(() => {
      recalculate();
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [enabled, recalculate, contentRef]);

  return {
    isExpanded,
    heightClass: isExpanded ? 'expandedHeight' : 'contentHeight',
    recalculate,
  };
}

export default useAdaptiveHeight;
