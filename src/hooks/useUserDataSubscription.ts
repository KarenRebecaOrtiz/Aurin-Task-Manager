/**
 * @module hooks/useUserDataSubscription
 * @description Hook para inicializar la suscripción del userDataStore
 * 
 * Este hook debe usarse en el layout principal (DashboardLayout)
 * para que la suscripción se inicie cuando el usuario esté autenticado.
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDataStore } from '@/stores/userDataStore';

/**
 * Hook que maneja la suscripción automática del userDataStore
 * basándose en el estado de autenticación.
 * 
 * Debe llamarse una sola vez en el layout principal.
 * 
 * @example
 * ```tsx
 * function DashboardLayoutContent({ children }) {
 *   useUserDataSubscription();
 *   // ...
 * }
 * ```
 */
export function useUserDataSubscription() {
  const { userId, isSynced } = useAuth();
  const subscribe = useUserDataStore((state) => state.subscribe);
  const unsubscribe = useUserDataStore((state) => state.unsubscribe);
  const reset = useUserDataStore((state) => state.reset);
  const currentUserId = useUserDataStore((state) => state.currentUserId);

  useEffect(() => {
    // Solo suscribirse cuando Firebase esté sincronizado y tengamos userId
    if (userId && isSynced) {
      // Solo suscribirse si no estamos ya suscritos a este usuario
      if (currentUserId !== userId) {
        subscribe(userId);
      }
    }
  }, [userId, isSynced, subscribe, currentUserId]);

  // Cleanup cuando el usuario se desloguea
  useEffect(() => {
    if (!userId) {
      reset();
    }
  }, [userId, reset]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);
}
