import { useState, useCallback, useEffect, useMemo } from 'react';

interface UseScrollDetectionProps {
  /**
   * Referencia al contenedor con scroll
   */
  scrollAreaRef: React.RefObject<HTMLDivElement>;

  /**
   * Delay para debouncing en milisegundos (default: 100ms)
   */
  debounceDelay?: number;

  /**
   * Tolerancia en pixels para considerar "at bottom" (default: 1px)
   */
  bottomThreshold?: number;
}

interface UseScrollDetectionReturn {
  /**
   * Si el usuario está en el bottom del scroll
   */
  isAtBottom: boolean;

  /**
   * Handler para el evento onScroll
   */
  handleScroll: () => void;

  /**
   * Función para hacer scroll al bottom
   */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

/**
 * Hook para detectar si el usuario está en el bottom del scroll
 * con debouncing para mejorar performance.
 *
 * Basado en las mejores prácticas de la documentación de paginación.
 */
export const useScrollDetection = ({
  scrollAreaRef,
  debounceDelay = 100,
  bottomThreshold = 1,
}: UseScrollDetectionProps): UseScrollDetectionReturn => {
  const [isAtBottom, setIsAtBottom] = useState(true);

  /**
   * Función para hacer scroll al bottom
   */
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!scrollAreaRef.current) return;

      const scrollAreaElement = scrollAreaRef.current;
      scrollAreaElement.scrollTo({
        top: scrollAreaElement.scrollHeight - scrollAreaElement.clientHeight,
        behavior,
      });
    },
    [scrollAreaRef]
  );

  /**
   * Handler con debouncing para detectar posición del scroll
   */
  const handleScroll = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    return () => {
      // Limpiar timeout anterior
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce: esperar antes de actualizar estado
      timeoutId = setTimeout(() => {
        if (!scrollAreaRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;

        // Tolerancia de bottomThreshold px para inconsistencias del navegador
        const atBottom = scrollHeight - clientHeight <= scrollTop + bottomThreshold;

        setIsAtBottom(atBottom);
      }, debounceDelay);
    };
  }, [scrollAreaRef, debounceDelay, bottomThreshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup no es necesario para setTimeout pero es buena práctica
    };
  }, []);

  return {
    isAtBottom,
    handleScroll,
    scrollToBottom,
  };
};
