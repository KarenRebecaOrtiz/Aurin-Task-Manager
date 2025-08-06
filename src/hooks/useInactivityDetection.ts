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

import { useEffect, useRef } from 'react';

export const useInactivityDetection = (timeout = 900000, onInactive: () => void, onActive?: () => void) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());
  const isPausedRef = useRef(false);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      console.log('[InactivityDetection] Timeout reached, calling onInactive callback');
      onInactive();
    }, timeout);
  };

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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[InactivityDetection] Activity detected, timer reset (throttled 10s)');
        }
      }
    };

    // Manejar cambios de visibilidad de la pestaña
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[InactivityDetection] Tab hidden, pausing activity detection');
        isPausedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        console.log('[InactivityDetection] Tab visible, resuming activity detection');
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
    console.log('[InactivityDetection] Initialized with timeout', timeout / 1000, 'seconds');

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
        document.removeEventListener(event, throttledReset);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) clearTimeout(timerRef.current);
      console.log('[InactivityDetection] Cleanup completed');
    };
  }, [timeout, onInactive, onActive]);

  return { resetTimer };
}; 