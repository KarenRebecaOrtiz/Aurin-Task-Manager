/**
 * useDayReset Hook
 * 
 * Hook para manejar el reset automático de estado al inicio de un nuevo día.
 * Basado en las mejores prácticas de Meta para persistencia de estado por día.
 * 
 * Características:
 * - Detección automática de nuevo día
 * - Reset a "Disponible" al inicio del día
 * - Persistencia de estado durante el día
 * - Integración con RTDB y Firestore
 * - Optimizado para reducir writes innecesarios
 */

import { useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, set, serverTimestamp } from 'firebase/database';
import { db, rtdb } from '@/lib/firebase';

export const useDayReset = () => {
  const { user, isLoaded } = useUser();
  const lastResetDate = useRef<string | null>(null);
  const isInitialized = useRef(false);

  /**
   * Verifica si es un nuevo día desde la última actualización de estado
   */
  const isNewDay = useCallback((lastUpdate: string | null): boolean => {
    if (!lastUpdate) return true;
    
    const today = new Date();
    const lastDate = new Date(lastUpdate);
    
    const todayDateString = today.toDateString();
    const lastDateString = lastDate.toDateString();
    
    return todayDateString !== lastDateString;
  }, []);

  /**
   * Realiza el reset de día
   */
  const performDayReset = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date();
      const todayString = now.toDateString();
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', user.id), {
        status: 'Disponible',
        dayStatus: 'Disponible',
        lastStatusChange: now.toISOString(),
        lastDayReset: now.toISOString()
      });

      // Actualizar en RTDB
      const presenceRef = ref(rtdb, `presence/${user.id}`);
      await set(presenceRef, {
        online: true,
        lastActive: serverTimestamp(),
        tabCount: 1,
        status: 'Disponible',
        dayReset: now.toISOString()
      });

      lastResetDate.current = todayString;
      
      console.log('[DayReset] Day reset performed successfully');
    } catch (error) {
      console.error('[DayReset] Error performing day reset:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isLoaded || isInitialized.current) return;

    isInitialized.current = true;

    // Listener para verificar reset de día
    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lastStatusChange = data.lastStatusChange;
        const lastDayReset = data.lastDayReset;

        // Verificar si es un nuevo día
        if (isNewDay(lastDayReset || lastStatusChange)) {
          console.log('[DayReset] New day detected, performing reset');
          await performDayReset();
        } else {
          // No es un nuevo día, solo actualizar referencia
          if (lastDayReset) {
            lastResetDate.current = new Date(lastDayReset).toDateString();
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isLoaded, isNewDay, performDayReset]);

  return {
    lastResetDate: lastResetDate.current,
    performDayReset
  };
}; 