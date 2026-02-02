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
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDataStore } from '@/stores/dataStore';
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

  // Obtener función para actualizar el dataStore (optimistic update)
  const updateUserStatus = useDataStore((state) => state.updateUserStatus);

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
    } catch {
      // Silently handle error
    }
  }, [user?.id]);

  /**
   * Actualiza el estado usando writes optimizados
   * Incluye optimistic update al dataStore para feedback instantáneo en toda la UI
   */
  const updateStatus = useCallback(async (newStatus: AvailabilityStatus) => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);

    try {
      // Optimistic update: actualizar dataStore inmediatamente
      updateUserStatus(user.id, newStatus);

      // Actualizar estado local
      setState(prev => ({ ...prev, currentStatus: newStatus }));

      // Persistir en Firestore
      await updateFirestoreStatus(newStatus);
    } catch {
      // Si falla, el listener de Firestore revertirá al estado correcto
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading, updateFirestoreStatus, updateUserStatus]);

  // Función para volver a Disponible cuando hay actividad
  const handleActivity = useCallback(() => {
    if (state.currentStatus === 'Fuera') {
      updateFirestoreStatus('Disponible');
    }
  }, [state.currentStatus, updateFirestoreStatus]);

  // Integrar detección de inactividad simplificada - solo si está Disponible
  useInactivityDetection(3600000, () => {
    // Solo marcar como Fuera si está Disponible
    if (state.currentStatus === 'Disponible') {
      updateFirestoreStatus('Fuera');
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
      }
    }, () => {
      // Silently handle error
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