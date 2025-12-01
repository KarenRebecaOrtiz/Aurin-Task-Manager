/**
 * @module config/utils/useDebouncedCallback
 * @description Hook para debounce de callbacks
 */

import { useCallback, useRef } from 'react';

/**
 * Hook que devuelve una versión debounced de un callback
 * @param callback - Función a ejecutar
 * @param delay - Delay en milisegundos
 * @returns Función debounced
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}
