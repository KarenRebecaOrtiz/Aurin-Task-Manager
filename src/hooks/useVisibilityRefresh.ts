/**
 * useVisibilityRefresh Hook
 *
 * Refresca los datos de usuarios cuando la pestaña vuelve a estar visible.
 * Esto asegura que los status de disponibilidad se actualicen sin necesidad
 * de listeners adicionales de Firestore.
 *
 * Uso:
 * - Solo refresca usuarios (para mantener el caching eficiente)
 * - Debounce de 2 segundos para evitar llamadas excesivas
 * - No refresca si ya está cargando
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { getUsers } from '@/services';

interface UseVisibilityRefreshOptions {
  /** Si está habilitado el refresh */
  enabled?: boolean;
  /** Delay mínimo entre refreshes en ms (default: 30000 = 30s) */
  minRefreshInterval?: number;
}

export function useVisibilityRefresh(options: UseVisibilityRefreshOptions = {}) {
  const { enabled = true, minRefreshInterval = 30000 } = options;

  const setUsers = useDataStore((state) => state.setUsers);
  const isLoadingUsers = useDataStore((state) => state.isLoadingUsers);
  const setIsLoadingUsers = useDataStore((state) => state.setIsLoadingUsers);

  const lastRefreshRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef(false);

  const refreshUsers = useCallback(async () => {
    // Evitar refreshes simultáneos o muy frecuentes
    const now = Date.now();
    if (
      isRefreshingRef.current ||
      isLoadingUsers ||
      now - lastRefreshRef.current < minRefreshInterval
    ) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      // Forzar refresh desde Firebase (ignorar cache)
      const usersResult = await getUsers();

      // Si hay promise de background refresh, esperar a esos datos frescos
      if (usersResult.promise) {
        const freshUsers = await usersResult.promise;
        setUsers(freshUsers);
      } else {
        setUsers(usersResult.data);
      }

      lastRefreshRef.current = Date.now();
      console.log('[useVisibilityRefresh] Users refreshed on visibility change');
    } catch (error) {
      console.warn('[useVisibilityRefresh] Failed to refresh users:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [setUsers, isLoadingUsers, minRefreshInterval]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Pequeño delay para evitar llamadas durante transiciones rápidas
        setTimeout(() => {
          refreshUsers();
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshUsers]);

  return { refreshUsers };
}
