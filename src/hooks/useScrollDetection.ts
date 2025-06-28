import { useCallback, useRef, useEffect } from 'react';

interface UseScrollDetectionProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  threshold?: number; // Porcentaje del scroll para activar carga (0-1)
  debounceMs?: number; // Tiempo de debounce en milisegundos
}

export const useScrollDetection = ({
  onLoadMore,
  hasMore,
  isLoadingMore,
  threshold = 0.8, // 80% del scroll
  debounceMs = 100,
}: UseScrollDetectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = useCallback(() => {
    if (!hasMore || isLoadingMore || !containerRef.current) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // Calcular el porcentaje de scroll
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    
    // Si el scroll está por encima del umbral, cargar más mensajes
    if (scrollPercentage <= threshold) {
      // Debounce para evitar múltiples llamadas
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        onLoadMore();
      }, debounceMs);
    }
  }, [hasMore, isLoadingMore, threshold, debounceMs, onLoadMore]);

  // Función para hacer scroll al final
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Función para hacer scroll a un elemento específico
  const scrollToElement = useCallback((element: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop + (elementRect.top - containerRect.top);
      
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior,
      });
    }
  }, []);

  // Función para mantener la posición del scroll al cargar más mensajes (específica para column-reverse)
  const maintainScrollPosition = useCallback((callback: () => void) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight } = container;
    
    // Ejecutar el callback
    callback();
    
    // Restaurar la posición del scroll después de que se actualice el DOM
    requestAnimationFrame(() => {
      if (containerRef.current) {
        const newScrollHeight = containerRef.current.scrollHeight;
        const heightDifference = newScrollHeight - scrollHeight;
        
        // Con column-reverse, necesitamos ajustar la posición del scroll
        // Los nuevos mensajes se agregan al final, pero visualmente aparecen arriba
        containerRef.current.scrollTop = scrollTop + heightDifference;
      }
    });
  }, []);

  // Función específica para column-reverse que mantiene la posición visual
  const maintainScrollPositionColumnReverse = useCallback((callback: () => void) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { scrollTop } = container;
    
    // Ejecutar el callback
    callback();
    
    // Restaurar la posición del scroll después de que se actualice el DOM
    requestAnimationFrame(() => {
      if (containerRef.current) {
        // Con column-reverse, los nuevos mensajes se agregan al final del array
        // pero visualmente aparecen en la parte superior
        // Por lo tanto, necesitamos mantener la misma posición visual
        containerRef.current.scrollTop = scrollTop;
      }
    });
  }, []);

  // Función para verificar si el usuario está cerca del final
  const isNearBottom = useCallback((tolerance = 100) => {
    if (!containerRef.current) return false;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    return scrollHeight - scrollTop - clientHeight <= tolerance;
  }, []);

  // Función para obtener información del scroll
  const getScrollInfo = useCallback(() => {
    if (!containerRef.current) return null;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollPercentage: scrollTop / (scrollHeight - clientHeight),
      isAtTop: scrollTop === 0,
      isAtBottom: scrollHeight - scrollTop - clientHeight <= 1,
    };
  }, []);

  // Función para cargar más mensajes manteniendo la posición del scroll
  const loadMoreWithPositionMaintenance = useCallback(() => {
    maintainScrollPosition(() => {
      onLoadMore();
    });
  }, [maintainScrollPosition, onLoadMore]);

  // Efecto para agregar/remover event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    scrollToBottom,
    scrollToElement,
    maintainScrollPosition,
    maintainScrollPositionColumnReverse,
    isNearBottom,
    getScrollInfo,
    loadMoreWithPositionMaintenance,
  };
}; 