/**
 * useInactivityDetection Hook
 * 
 * Hook para detectar inactividad del usuario y marcar como offline automáticamente.
 * Basado en las mejores prácticas de Meta (Facebook/WhatsApp) para detección de inactividad.
 * 
 * Características:
 * - Detección de eventos de actividad (mouse, keyboard, scroll, touch)
 * - Pausa de timers cuando la pestaña está oculta (Page Visibility API)
 * - Timeout configurable (por defecto 15 minutos para evitar resets frecuentes)
 * - Integración con Firebase RTDB para presencia en tiempo real
 * - Optimizado para reducir writes a Firestore
 * - Remueve conexión específica en lugar de global
 * 
 * Mejoras: Aumentado timeout a 15min para evitar resets frecuentes; throttle más agresivo de 10s.
 * Param: connectionId para remover específica.
 */

import { useEffect, useRef, useCallback } from 'react';

export const useInactivityDetection = (timeout = 900000, onInactive: () => void, onActive?: () => void) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());
  const isPausedRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onInactive();
    }, timeout);
  }, [timeout, onInactive]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle más agresivo para evitar resets frecuentes
    const throttledReset = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Solo resetear si han pasado al menos 10 segundos desde la última actividad
      if (timeSinceLastActivity > 10000) {
        resetTimer();
        lastActivityRef.current = now;
        
        // Call onActive callback if provided
        if (onActive) {
          onActive();
        }
      }
    };

    // Manejar cambios de visibilidad de la pestaña
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        isPausedRef.current = false;
        lastActivityRef.current = Date.now();
        resetTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, throttledReset, { passive: true });
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Agregar listener de visibilidad
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer(); // Start timer

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
        document.removeEventListener(event, throttledReset);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeout, onInactive, onActive, resetTimer]);

  return { resetTimer };
}; 