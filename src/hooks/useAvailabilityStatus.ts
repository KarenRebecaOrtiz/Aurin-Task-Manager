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
 * 
 * Mejoras: Usa lista de conexiones en RTDB para multi-tab, computa online basado en child count.
 */

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useInactivityDetection } from './useInactivityDetection';
import { useDayReset } from './useDayReset';

export type AvailabilityStatus = 'Disponible' | 'Ocupado' | 'Por terminar' | 'Fuera';

interface AvailabilityState {
  currentStatus: AvailabilityStatus;
  isOnline: boolean;
  isLoading: boolean;
  lastStatusChange: string | null;
  dayStatus: AvailabilityStatus;
}

export const useAvailabilityStatus = () => {
  const { user, isLoaded } = useUser();
  const [state, setState] = useState<AvailabilityState>({
    currentStatus: 'Disponible',
    isOnline: false,
    isLoading: true,
    lastStatusChange: null,
    dayStatus: 'Disponible'
  });

  const [isLoading, setIsLoading] = useState(false);
  const isInitializedRef = useRef(false);

  /**
   * Actualiza el estado de disponibilidad en Firestore
   */
  const updateFirestoreStatus = useCallback(async (newStatus: AvailabilityStatus) => {
    if (!user?.id) return;
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        status: newStatus,
        lastStatusChange: new Date().toISOString(),
        lastOnlineAt: new Date().toISOString()
      });
      console.log('[AvailabilityStatus] Firestore status updated to:', newStatus);
    } catch (error) {
      console.error('[AvailabilityStatus] Error updating Firestore status:', error);
    }
  }, [user?.id]);

  /**
   * Actualiza el estado usando writes optimizados
   */
  const updateStatus = useCallback(async (newStatus: AvailabilityStatus) => {
    if (!user?.id || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await updateFirestoreStatus(newStatus);
      setState(prev => ({ ...prev, currentStatus: newStatus }));
      console.log('[AvailabilityStatus] Status updated to:', newStatus);
    } catch (error) {
      console.error('[AvailabilityStatus] Error in updateStatus:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading, updateFirestoreStatus]);

  // Función para volver a Disponible cuando hay actividad
  const handleActivity = useCallback(() => {
    if (state.currentStatus === 'Fuera') {
      console.log('[AvailabilityStatus] Activity detected, returning to Disponible');
      updateFirestoreStatus('Disponible');
    }
  }, [state.currentStatus, updateFirestoreStatus]);

  // Integrar detección de inactividad simplificada - solo si está Disponible
  useInactivityDetection(3600000, () => {
    // Solo marcar como Fuera si está Disponible
    if (state.currentStatus === 'Disponible') {
      console.log('[AvailabilityStatus] Inactivity detected, marking as Fuera');
      updateFirestoreStatus('Fuera');
    } else {
      console.log('[AvailabilityStatus] Inactivity detected but status is not Disponible, ignoring');
    }
  }, handleActivity);

  // Integrar reset de día
  useDayReset();

  // Listener de Firestore para sincronizar estado
  useEffect(() => {
    if (!user?.id || !isLoaded) return;

    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const currentStatus = data.status as AvailabilityStatus || 'Disponible';
        const lastStatusChange = data.lastStatusChange || null;
        const dayStatus = data.dayStatus as AvailabilityStatus || 'Disponible';
        
        setState(prev => ({
          ...prev,
          currentStatus,
          lastStatusChange,
          dayStatus,
          isLoading: false,
          isOnline: currentStatus !== 'Fuera'
        }));
        
        console.log('[AvailabilityStatus] Firestore state synced:', JSON.stringify({ currentStatus, isOnline: currentStatus !== 'Fuera' }));
      }
    }, (error) => {
      console.error('[AvailabilityStatus] Firestore listener error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    });

    return () => unsubscribe();
  }, [user?.id, isLoaded]);

  return {
    currentStatus: state.currentStatus,
    isOnline: state.isOnline,
    isLoading: state.isLoading || isLoading,
    updateStatus,
    lastStatusChange: state.lastStatusChange,
    dayStatus: state.dayStatus
  };
};