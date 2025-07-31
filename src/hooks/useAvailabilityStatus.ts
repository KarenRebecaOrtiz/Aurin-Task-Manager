/**
 * useAvailabilityStatus Hook
 * 
 * Este hook forma parte de una aplicación web React/Next.js que gestiona el estado de disponibilidad de usuarios.
 * Maneja la lógica compleja de persistencia por día y sincronización entre pestañas.
 * 
 * Características principales:
 * - Persistencia de estado por día (resetea a "Disponible" en nuevo día)
 * - Sincronización en tiempo real con Firestore
 * - Gestión automática de estado "Fuera" cuando no hay pestañas abiertas
 * - Sincronización entre múltiples componentes (AvailabilityToggle y AvatarDropdown)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AvailabilityStatus = 'Disponible' | 'Ocupado' | 'Por terminar' | 'Fuera';

interface AvailabilityState {
  currentStatus: AvailabilityStatus;
  isOnline: boolean;
  isLoading: boolean;
  lastStatusChange: string | null;
  dayStatus: AvailabilityStatus; // El estado configurado por el usuario para el día
}

/**
 * Hook principal para gestión de estado de disponibilidad
 * 
 * Reglas de negocio:
 * 1. Si hay ventana abierta + sesión iniciada = estado configurado (Disponible/Ocupado)
 * 2. Si no hay ventana abierta o sin sesión = "Fuera"
 * 3. Estado persiste durante el día, resetea a "Disponible" en nuevo día
 * 4. Sincronización automática entre pestañas y componentes
 */
export const useAvailabilityStatus = () => {
  const { user, isLoaded } = useUser();
  
  const [state, setState] = useState<AvailabilityState>({
    currentStatus: 'Disponible',
    isOnline: false,
    isLoading: true,
    lastStatusChange: null,
    dayStatus: 'Disponible'
  });

  const tabCountRef = useRef(0);
  const isInitializedRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
   * Actualiza el estado en Firestore con validación
   */
  const updateFirestoreStatus = useCallback(async (
    newStatus: AvailabilityStatus,
    isDayReset = false
  ) => {
    if (!user?.id) return;
    
    try {
      const updateData: any = {
        status: newStatus,
        lastOnlineAt: new Date().toISOString(),
        isOnline: tabCountRef.current > 0
      };

      if (isDayReset || newStatus !== 'Fuera') {
        updateData.lastStatusChange = new Date().toISOString();
        updateData.dayStatus = newStatus === 'Fuera' ? state.dayStatus : newStatus;
      }

      await updateDoc(doc(db, 'users', user.id), updateData);
      
      console.log(`[AvailabilityStatus] Updated status: ${newStatus}`, {
        isDayReset,
        tabCount: tabCountRef.current,
        userId: user.id
      });
    } catch (error) {
      console.error('[AvailabilityStatus] Error updating status:', error);
      throw error;
    }
  }, [user?.id, state.dayStatus]);

  /**
   * Maneja el cambio de estado manual por parte del usuario
   */
  const updateStatus = useCallback(async (newStatus: AvailabilityStatus) => {
    if (!user?.id || state.isLoading) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Solo permitir cambios entre Disponible y Ocupado cuando está online
      if (tabCountRef.current > 0 && (newStatus === 'Disponible' || newStatus === 'Ocupado')) {
        await updateFirestoreStatus(newStatus);
        setState(prev => ({
          ...prev,
          currentStatus: newStatus,
          dayStatus: newStatus,
          lastStatusChange: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('[AvailabilityStatus] Error in updateStatus:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, state.isLoading, updateFirestoreStatus]);

  /**
   * Gestión de pestañas y estado online/offline
   */
  useEffect(() => {
    if (!user?.id || !isLoaded) return;

    // Incrementar contador de pestañas
    tabCountRef.current += 1;
    
    const handleBeforeUnload = async () => {
      tabCountRef.current -= 1;
      
      // Si es la última pestaña, marcar como "Fuera"
      if (tabCountRef.current <= 0) {
        try {
          await updateFirestoreStatus('Fuera');
        } catch (error) {
          console.error('[AvailabilityStatus] Error on beforeunload:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      // Por ahora solo loggeamos, puede extenderse para más lógica
      if (document.visibilityState === 'hidden') {
        console.log('[AvailabilityStatus] Tab hidden, maintaining status');
      } else {
        console.log('[AvailabilityStatus] Tab visible');
      }
    };

    // Heartbeat para mantener vivo el estado online
    heartbeatIntervalRef.current = setInterval(() => {
      if (tabCountRef.current > 0 && state.currentStatus !== 'Fuera') {
        updateDoc(doc(db, 'users', user.id), { 
          lastOnlineAt: new Date().toISOString(),
          isOnline: true
        }).catch(console.error);
      }
    }, 60000); // Cada minuto

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      tabCountRef.current = Math.max(0, tabCountRef.current - 1);
    };
  }, [user?.id, isLoaded, updateFirestoreStatus, state.currentStatus]);

  /**
   * Listener de Firestore para sincronización en tiempo real
   */
  useEffect(() => {
    if (!user?.id || !isLoaded) return;

    const userDocRef = doc(db, 'users', user.id);
    
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const firestoreStatus = data.status || 'Disponible';
        const dayStatus = data.dayStatus || 'Disponible';
        const lastStatusChange = data.lastStatusChange;
        const isOnline = Boolean(data.isOnline);

        // Lógica de inicialización y reset de día
        if (!isInitializedRef.current && tabCountRef.current > 0) {
          isInitializedRef.current = true;
          
          // Verificar si es un nuevo día
          if (isNewDay(lastStatusChange)) {
            console.log('[AvailabilityStatus] New day detected, resetting to Disponible');
            await updateFirestoreStatus('Disponible', true);
            setState(prev => ({
              ...prev,
              currentStatus: 'Disponible',
              dayStatus: 'Disponible',
              isOnline: true,
              isLoading: false,
              lastStatusChange: new Date().toISOString()
            }));
            return;
          }
          
          // Si hay pestañas abiertas, restaurar el estado del día
          if (firestoreStatus === 'Fuera' && tabCountRef.current > 0) {
            await updateFirestoreStatus(dayStatus);
            setState(prev => ({
              ...prev,
              currentStatus: dayStatus,
              dayStatus,
              isOnline: true,
              isLoading: false,
              lastStatusChange
            }));
            return;
          }
        }

        // Actualización normal de estado
        setState(prev => ({
          ...prev,
          currentStatus: firestoreStatus,
          dayStatus,
          isOnline,
          isLoading: false,
          lastStatusChange
        }));
      }
    }, (error) => {
      console.error('[AvailabilityStatus] Firestore listener error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    });

    return () => unsubscribe();
  }, [user?.id, isLoaded, updateFirestoreStatus, isNewDay]);

  return {
    currentStatus: state.currentStatus,
    dayStatus: state.dayStatus,
    isOnline: state.isOnline,
    isLoading: state.isLoading,
    updateStatus,
    tabCount: tabCountRef.current
  };
};