/**
 * @module stores/usersDataStore
 * @description Single Source of Truth para los datos de OTROS usuarios (no el usuario en sesión).
 *
 * Este store:
 * - Maneja múltiples usuarios simultáneamente (N usuarios)
 * - Cache híbrido: In-Memory LRU + SessionStorage
 * - Suscripciones on-demand a Firestore con onSnapshot
 * - Cleanup automático de usuarios no usados (evita memory leaks)
 * - Métricas integradas (hits, misses, hit rate)
 *
 * Arquitectura:
 * - In-Memory LRU Cache: Máximo 50 usuarios, auto-limpieza
 * - SessionStorage: Persistencia entre re-renders con TTL de 5 min
 * - Firestore Listeners: Actualizaciones en tiempo real
 * - Auto-cleanup: Cada 5 minutos limpia entradas expiradas
 *
 * @see /documentation/USERS_DATA_STORE.md para guía completa
 */

import { create } from 'zustand';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LruMap } from '@/shared/utils/lru-map';
import type { UserData } from './userDataStore';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CACHE_TTL = 5 * 60 * 1000;          // 5 minutos (igual que userDataStore)
const MAX_USERS_IN_MEMORY = 50;           // Límite LRU para evitar memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;   // Limpieza automática cada 5 minutos
const SESSION_STORAGE_PREFIX = 'users_cache_';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entrada de cache con timestamp y source
 */
interface CachedUserEntry {
  data: UserData;
  timestamp: number;
  source: 'cache' | 'network';
}

/**
 * Métricas del store (similar a RequestCache)
 */
interface UsersDataStats {
  hits: number;              // Cuántas veces se encontró en cache
  misses: number;            // Cuántas veces NO se encontró en cache
  subscriptions: number;     // Número de suscripciones activas a Firestore
}

/**
 * Estado del store
 */
interface UsersDataState {
  // In-memory cache con LRU automático
  users: LruMap<string, CachedUserEntry>;

  // Suscripciones activas (Firestore listeners)
  subscriptions: Map<string, Unsubscribe>;

  // Estado de carga por usuario
  loadingUsers: Set<string>;

  // Errores por usuario
  errors: Map<string, Error>;

  // Métricas
  stats: UsersDataStats;
}

/**
 * Acciones del store
 */
interface UsersDataActions {
  /**
   * Suscribirse a un usuario (crea listener de Firestore)
   * - Intenta cargar desde cache primero (UI instantánea)
   * - Establece onSnapshot para actualizaciones en tiempo real
   * - Evita suscripciones duplicadas automáticamente
   */
  subscribeToUser: (userId: string) => void;

  /**
   * Desuscribirse de un usuario (elimina listener de Firestore)
   * - No elimina el cache (puede seguir siendo útil)
   * - Útil para cleanup al desmontar componentes
   */
  unsubscribeFromUser: (userId: string) => void;

  /**
   * Obtener datos de usuario (cache-first strategy)
   * - Primero verifica in-memory cache
   * - Luego verifica sessionStorage
   * - Retorna null si no está en cache (sugiere suscribirse)
   */
  getUserData: (userId: string) => UserData | null;

  /**
   * Invalidar cache de un usuario específico
   * - Elimina de in-memory cache
   * - Elimina de sessionStorage
   * - El listener de Firestore (si existe) volverá a popular el cache
   */
  invalidateUser: (userId: string) => void;

  /**
   * Invalidar cache de TODOS los usuarios
   * - Limpia in-memory cache completo
   * - Limpia sessionStorage completo
   * - No afecta las suscripciones activas
   */
  invalidateAll: () => void;

  /**
   * Cleanup manual de entradas expiradas
   * - Verifica TTL de cada entrada
   * - Elimina entradas expiradas de ambos caches
   * - Retorna número de entradas eliminadas
   */
  cleanupExpired: () => number;

  /**
   * Obtener estadísticas del store
   * - Cache hits/misses
   * - Hit rate (%)
   * - Tamaño actual del cache
   * - Suscripciones activas
   */
  getStats: () => {
    hits: number;
    misses: number;
    hitRate: number;
    cacheSize: number;
    activeSubscriptions: number;
  };

  /**
   * Desuscribirse de todos los usuarios
   * - Útil para cleanup global (logout, unmount de app)
   */
  unsubscribeAll: () => void;
}

// ============================================================================
// HELPERS: SESSION STORAGE
// ============================================================================

/**
 * Obtener datos de un usuario desde sessionStorage
 * Verifica TTL automáticamente
 */
function getSessionCache(userId: string): CachedUserEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = `${SESSION_STORAGE_PREFIX}${userId}`;
    const cached = sessionStorage.getItem(key);

    if (!cached) return null;

    const entry: CachedUserEntry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    // Verificar TTL
    if (age > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch (error) {
    console.warn('[usersDataStore] Error reading sessionStorage:', error);
    return null;
  }
}

/**
 * Guardar datos de un usuario en sessionStorage
 */
function setSessionCache(userId: string, data: UserData): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `${SESSION_STORAGE_PREFIX}${userId}`;
    const entry: CachedUserEntry = {
      data,
      timestamp: Date.now(),
      source: 'network',
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    // SessionStorage puede fallar si está lleno - silencioso
    console.warn('[usersDataStore] SessionStorage full or error:', error);
  }
}

/**
 * Limpiar datos de un usuario de sessionStorage
 */
function clearSessionCache(userId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `${SESSION_STORAGE_PREFIX}${userId}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Limpiar TODOS los datos de usuarios de sessionStorage
 */
function clearAllSessionCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(SESSION_STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    // Silently fail
  }
}

// ============================================================================
// STORE
// ============================================================================

export const useUsersDataStore = create<UsersDataState & UsersDataActions>((set, get) => ({
  // ========================================
  // STATE
  // ========================================
  users: new LruMap<string, CachedUserEntry>(MAX_USERS_IN_MEMORY),
  subscriptions: new Map<string, Unsubscribe>(),
  loadingUsers: new Set<string>(),
  errors: new Map<string, Error>(),
  stats: {
    hits: 0,
    misses: 0,
    subscriptions: 0,
  },

  // ========================================
  // ACTIONS
  // ========================================

  subscribeToUser: (userId: string) => {
    const { subscriptions, loadingUsers, users } = get();

    // Evitar suscripciones duplicadas
    if (subscriptions.has(userId)) {
      console.log(`[usersDataStore] ℹ️ Ya existe suscripción para ${userId}`);
      return;
    }

    // 1. Intentar cargar desde cache primero para UI inmediata
    const sessionCached = getSessionCache(userId);
    if (sessionCached) {
      console.log(`[usersDataStore] ✅ Session cache HIT: ${userId}`);
      users.set(userId, sessionCached);
      set((state) => ({
        stats: { ...state.stats, hits: state.stats.hits + 1 },
      }));
    } else {
      // Marcar como loading si no hay cache
      const newLoadingUsers = new Set(loadingUsers);
      newLoadingUsers.add(userId);
      set({ loadingUsers: newLoadingUsers });
    }

    // 2. Establecer listener de Firestore para actualizaciones en tiempo real
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        const state = get();

        if (!docSnap.exists()) {
          console.warn(`[usersDataStore] ⚠️ Usuario ${userId} no existe en Firestore`);

          const newErrors = new Map(state.errors);
          newErrors.set(userId, new Error('User not found'));

          const newLoadingUsers = new Set(state.loadingUsers);
          newLoadingUsers.delete(userId);

          set({
            errors: newErrors,
            loadingUsers: newLoadingUsers,
          });
          return;
        }

        const userData = docSnap.data() as UserData;
        const entry: CachedUserEntry = {
          data: userData,
          timestamp: Date.now(),
          source: 'network',
        };

        // Actualizar in-memory cache (LRU automático)
        state.users.set(userId, entry);

        // Actualizar session storage
        setSessionCache(userId, userData);

        // Limpiar loading y errores
        const newLoadingUsers = new Set(state.loadingUsers);
        newLoadingUsers.delete(userId);

        const newErrors = new Map(state.errors);
        newErrors.delete(userId);

        // Force update - crear nuevo LruMap para trigger re-render
        const newUsers = new LruMap<string, CachedUserEntry>(MAX_USERS_IN_MEMORY);
        state.users.forEach((value, key) => {
          newUsers.set(key, value);
        });

        set({
          users: newUsers,
          loadingUsers: newLoadingUsers,
          errors: newErrors,
        });

        console.log(`[usersDataStore] 🔄 Datos actualizados: ${userId}`);
      },
      (error) => {
        const state = get();
        console.error(`[usersDataStore] ❌ Error en suscripción ${userId}:`, error);

        const newErrors = new Map(state.errors);
        newErrors.set(userId, error as Error);

        const newLoadingUsers = new Set(state.loadingUsers);
        newLoadingUsers.delete(userId);

        set({
          errors: newErrors,
          loadingUsers: newLoadingUsers,
        });
      }
    );

    // Guardar unsubscribe function
    const newSubscriptions = new Map(subscriptions);
    newSubscriptions.set(userId, unsubscribe);

    set((state) => ({
      subscriptions: newSubscriptions,
      stats: {
        ...state.stats,
        subscriptions: state.stats.subscriptions + 1,
      },
    }));

    console.log(`[usersDataStore] ✅ Suscrito a ${userId}`);
  },

  unsubscribeFromUser: (userId: string) => {
    const { subscriptions } = get();

    const unsubscribe = subscriptions.get(userId);
    if (unsubscribe) {
      unsubscribe();

      const newSubscriptions = new Map(subscriptions);
      newSubscriptions.delete(userId);

      set((state) => ({
        subscriptions: newSubscriptions,
        stats: {
          ...state.stats,
          subscriptions: state.stats.subscriptions - 1,
        },
      }));

      console.log(`[usersDataStore] ❌ Desuscrito de ${userId}`);
    }
  },

  getUserData: (userId: string) => {
    const { users } = get();

    // 1. Verificar in-memory cache
    const cached = users.get(userId);
    if (cached) {
      const age = Date.now() - cached.timestamp;

      if (age <= CACHE_TTL) {
        set((state) => ({
          stats: { ...state.stats, hits: state.stats.hits + 1 },
        }));
        return cached.data;
      }

      // Expirado - eliminar
      users.delete(userId);
    }

    // 2. Verificar session storage
    const sessionCached = getSessionCache(userId);
    if (sessionCached) {
      users.set(userId, sessionCached);

      // Force update
      const newUsers = new LruMap<string, CachedUserEntry>(MAX_USERS_IN_MEMORY);
      users.forEach((value, key) => {
        newUsers.set(key, value);
      });

      set((state) => ({
        users: newUsers,
        stats: { ...state.stats, hits: state.stats.hits + 1 },
      }));

      return sessionCached.data;
    }

    // 3. Cache MISS
    set((state) => ({
      stats: { ...state.stats, misses: state.stats.misses + 1 },
    }));

    return null;
  },

  invalidateUser: (userId: string) => {
    const { users } = get();

    users.delete(userId);
    clearSessionCache(userId);

    // Force update
    const newUsers = new LruMap<string, CachedUserEntry>(MAX_USERS_IN_MEMORY);
    users.forEach((value, key) => {
      newUsers.set(key, value);
    });

    set({ users: newUsers });

    console.log(`[usersDataStore] 🗑️ Cache invalidado: ${userId}`);
  },

  invalidateAll: () => {
    const { users } = get();

    // Limpiar in-memory
    users.clear();

    // Limpiar session storage (todos los users_cache_*)
    clearAllSessionCache();

    set({ users: new LruMap<string, CachedUserEntry>(MAX_USERS_IN_MEMORY) });

    console.log('[usersDataStore] 🗑️ Cache completo invalidado');
  },

  cleanupExpired: () => {
    const { users } = get();
    const now = Date.now();
    let removed = 0;

    // Limpiar in-memory
    const toDelete: string[] = [];
    users.forEach((entry, userId) => {
      const age = now - entry.timestamp;
      if (age > CACHE_TTL) {
        toDelete.push(userId);
      }
    });

    toDelete.forEach((userId) => {
      users.delete(userId);
      removed++;
    });

    // Limpiar session storage
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(sessionStorage);
        keys.forEach((key) => {
          if (key.startsWith(SESSION_STORAGE_PREFIX)) {
            const cached = sessionStorage.getItem(key);
            if (cached) {
              try {
                const entry = JSON.parse(cached);
                const age = now - entry.timestamp;
                if (age > CACHE_TTL) {
                  sessionStorage.removeItem(key);
                  removed++;
                }
              } catch {
                // Invalid JSON - remove
                sessionStorage.removeItem(key);
                removed++;
              }
            }
          }
        });
      } catch (error) {
        console.warn('[usersDataStore] Error during sessionStorage cleanup:', error);
      }
    }

    if (removed > 0) {
      // Force update
      const newUsers = new LruMap<string, CachedUserEntry>(MAX_USERS_IN_MEMORY);
      users.forEach((value, key) => {
        newUsers.set(key, value);
      });

      set({ users: newUsers });
      console.log(`[usersDataStore] 🧹 Limpiados ${removed} usuarios expirados`);
    }

    return removed;
  },

  getStats: () => {
    const { stats, users, subscriptions } = get();
    const total = stats.hits + stats.misses;

    return {
      ...stats,
      hitRate: total > 0 ? stats.hits / total : 0,
      cacheSize: users.size,
      activeSubscriptions: subscriptions.size,
    };
  },

  unsubscribeAll: () => {
    const { subscriptions } = get();

    let count = 0;
    subscriptions.forEach((unsubscribe) => {
      unsubscribe();
      count++;
    });

    set({
      subscriptions: new Map(),
      stats: { hits: 0, misses: 0, subscriptions: 0 },
    });

    console.log(`[usersDataStore] 🔌 Desuscrito de ${count} usuarios`);
  },
}));

// ============================================================================
// CLEANUP AUTOMÁTICO
// ============================================================================

if (typeof window !== 'undefined') {
  // Limpieza automática cada 5 minutos (como SimpleChatCache)
  setInterval(() => {
    const removed = useUsersDataStore.getState().cleanupExpired();
    if (removed > 0) {
      console.log(`[usersDataStore] ⏰ Auto-cleanup ejecutado: ${removed} entradas eliminadas`);
    }
  }, CLEANUP_INTERVAL);

  // Cleanup al cerrar la ventana/pestaña
  window.addEventListener('beforeunload', () => {
    useUsersDataStore.getState().unsubscribeAll();
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { UsersDataState, UsersDataActions, CachedUserEntry, UsersDataStats };
