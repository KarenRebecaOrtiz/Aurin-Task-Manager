/**
 * @module hooks/usePinnedTasksSubscription
 * @description Hook para inicializar la suscripción del pinnedTasksStore
 *
 * Este hook debe usarse en el layout principal (DashboardLayout)
 * para que la suscripción se inicie cuando el usuario esté autenticado.
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePinnedTasksStore } from '../stores/pinnedTasksStore';

/**
 * Hook que maneja la suscripción automática del pinnedTasksStore
 * basándose en el estado de autenticación.
 *
 * Debe llamarse una sola vez en el layout principal.
 *
 * @example
 * ```tsx
 * function DashboardLayoutContent({ children }) {
 *   usePinnedTasksSubscription();
 *   // ...
 * }
 * ```
 */
export function usePinnedTasksSubscription() {
  const { userId, isSynced } = useAuth();
  const subscribe = usePinnedTasksStore((state) => state.subscribe);
  const unsubscribe = usePinnedTasksStore((state) => state.unsubscribe);
  const currentUserId = usePinnedTasksStore((state) => state.currentUserId);

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
      unsubscribe();
    }
  }, [userId, unsubscribe]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);
}
