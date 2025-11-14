/**
 * EJEMPLO DE REFACTORIZACIÓN - useSharedTasksState
 *
 * Este archivo muestra cómo debería verse tu hook DESPUÉS de la migración
 * a la capa de servicios. NO USES ESTE ARCHIVO DIRECTAMENTE.
 *
 * INSTRUCCIONES:
 * 1. Lee este archivo completo para entender el patrón
 * 2. Compáralo con tu useSharedTasksState.ts actual
 * 3. Aplica los cambios manualmente a tu archivo real
 * 4. Elimina este archivo .EXAMPLE cuando termines
 */

import { useEffect, useState } from 'react';
import { useDataStore } from '@/stores/useDataStore';
import { getTasks, fetchTasksFromNetwork, getClients, getUsers } from '@/services';

/**
 * Hook simplificado que orquesta la obtención de datos
 * usando la nueva capa de servicios.
 *
 * RESPONSABILIDADES (REDUCIDAS):
 * - Llamar a los servicios para obtener datos
 * - Actualizar el store global con los datos
 * - Manejar el estado de carga
 * - Implementar stale-while-revalidate para datos cacheados
 *
 * LO QUE YA NO HACE:
 * ❌ Lógica de queries a Firebase (ahora en services)
 * ❌ Mapeo de datos (ahora en services)
 * ❌ Gestión de cache (ahora en services)
 */
export const useSharedTasksState = () => {
  // --- ESTADOS ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // --- STORES ---
  const setDataStore = useDataStore(state => state.setDataStore);

  useEffect(() => {
    let isMounted = true; // Prevenir actualizaciones si el componente se desmonta

    const fetchData = async () => {
      try {
        console.log('[useSharedTasksState] 🚀 Iniciando obtención de datos...');

        // ✨ PASO 1: Obtener tareas (puede venir del cache o red)
        const tasksResult = await getTasks();
        console.log(`[useSharedTasksState] ✅ Tareas obtenidas desde: ${tasksResult.source}`);

        // ✨ PASO 2: Obtener clientes (siempre desde red por ahora)
        const clients = await getClients();
        console.log('[useSharedTasksState] ✅ Clientes obtenidos');

        // ✨ PASO 3: Obtener usuarios (siempre desde red por ahora)
        const users = await getUsers();
        console.log('[useSharedTasksState] ✅ Usuarios obtenidos');

        // ✨ PASO 4: Actualizar el store global si el componente sigue montado
        if (isMounted) {
          setDataStore({
            tasks: tasksResult.data,
            clients,
            users,
          });
          console.log('[useSharedTasksState] 📦 Store actualizado');
        }

        // ✨ PASO 5: Si los datos vinieron del cache, obtener datos frescos en segundo plano
        if (tasksResult.source === 'cache') {
          console.log('[useSharedTasksState] 🔄 Datos del cache mostrados. Obteniendo datos frescos en segundo plano...');

          // Esta llamada NO bloquea la UI
          fetchTasksFromNetwork()
            .then((freshResult) => {
              if (isMounted) {
                console.log('[useSharedTasksState] ✨ Datos frescos obtenidos. Actualizando store...');
                setDataStore({
                  tasks: freshResult.data,
                  clients, // Mantenemos los mismos clients y users
                  users,
                });
              }
            })
            .catch((bgError) => {
              // Error en segundo plano, no crítico
              console.warn('[useSharedTasksState] ⚠️ Error al obtener datos frescos:', bgError);
            });
        }

      } catch (err) {
        console.error('[useSharedTasksState] ❌ Error al obtener datos:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Error desconocido'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log('[useSharedTasksState] 🏁 Carga inicial completada');
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [setDataStore]); // Solo se ejecuta una vez al montar

  return {
    isLoading,
    error,
  };
};

/**
 * COMPARACIÓN: ANTES vs DESPUÉS
 *
 * ANTES (Líneas de código):
 * - ~150-200 líneas
 * - Lógica de Firebase mezclada con React
 * - Estado local complejo (tasks, clients, users, isLoading, etc.)
 * - Mapeo de datos manual
 * - Sin cacheo persistente
 *
 * DESPUÉS (Líneas de código):
 * - ~80-100 líneas
 * - Lógica separada en servicios
 * - Solo 2 estados locales (isLoading, error)
 * - Cacheo automático con stale-while-revalidate
 * - Código más legible y mantenible
 *
 * BENEFICIOS:
 * ✅ Separación de responsabilidades (SoC)
 * ✅ Más fácil de testear (puedes mockear los servicios)
 * ✅ Cacheo persistente automático
 * ✅ Experiencia de usuario mejorada (carga instantánea)
 * ✅ Código reutilizable (otros hooks pueden usar los servicios)
 * ✅ Más fácil de extender (agregar nuevas fuentes de datos)
 */

/**
 * PRÓXIMOS PASOS PARA TU MIGRACIÓN:
 *
 * 1. PREPARACIÓN:
 *    - Haz un backup de tu useSharedTasksState.ts actual
 *    - Asegúrate de que los servicios estén implementados correctamente
 *
 * 2. MIGRACIÓN:
 *    - Abre tu useSharedTasksState.ts actual
 *    - Compáralo con este archivo .EXAMPLE
 *    - Reemplaza la lógica vieja con la nueva (usa este archivo como guía)
 *
 * 3. TESTING:
 *    - Verifica que la app cargue correctamente
 *    - Recarga la página varias veces para probar el cache
 *    - Abre DevTools → Application → IndexedDB → keyval-store → keyval
 *    - Deberías ver la key 'tasks' con tus datos cacheados
 *
 * 4. DEBUGGING:
 *    - Si algo falla, revisa la consola del navegador
 *    - Los console.log te ayudarán a entender el flujo
 *    - Puedes eliminarlos después de verificar que todo funciona
 *
 * 5. LIMPIEZA:
 *    - Elimina este archivo .EXAMPLE
 *    - Elimina los console.log si no los necesitas
 *    - Considera agregar cache a clients y users también
 */
