/**
 * Simple Chat Cache
 *
 * Cache minimalista para apps pequeñas (<20 usuarios, <10 chats).
 * Basado en patrones de Apple pero simplificado para tu caso de uso.
 *
 * Características:
 * - Cache de mensajes en memoria (evita re-fetches)
 * - Scroll position preservation (mejora UX)
 * - Auto-limpieza después de 10 minutos de inactividad
 * - Sin límite de tamaño (no es necesario con pocos chats)
 *
 * @see /Users/karen/Desktop/apps.apple.com-main/shared/utils/src/history.ts
 */

import type { Message } from '../types';
import type { DocumentSnapshot } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

interface ChatCacheEntry {
  messages: Message[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  scrollY: number;
  timestamp: number; // Para auto-limpieza
}

interface CacheStats {
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

// ============================================================================
// SIMPLE CHAT CACHE CLASS
// ============================================================================

/**
 * Cache simple para chats
 * No usa LRU porque nunca tendrás más de 5-10 chats abiertos
 */
class SimpleChatCache {
  private cache: Map<string, ChatCacheEntry>;
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutos
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new Map();
    this.startAutoCleanup();
  }

  /**
   * Obtiene mensajes cacheados de una tarea
   *
   * @param taskId - ID de la tarea
   * @returns Entry completo o null si no existe o expiró
   */
  get(taskId: string): ChatCacheEntry | null {
    const entry = this.cache.get(taskId);

    if (!entry) {
      return null;
    }

    // Verificar si expiró
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL_MS) {
      this.cache.delete(taskId);
      return null;
    }

  // ...
    return entry;
  }

  /**
   * Guarda mensajes en cache
   *
   * @param taskId - ID de la tarea
   * @param messages - Lista de mensajes
   * @param lastDoc - Último documento de Firestore
   * @param hasMore - Si hay más mensajes disponibles
   * @param scrollY - Posición del scroll (default: 0)
   */
  set(
    taskId: string,
    messages: Message[],
    lastDoc: DocumentSnapshot | null,
    hasMore: boolean,
    scrollY: number = 0
  ): void {
    this.cache.set(taskId, {
      messages,
      lastDoc,
      hasMore,
      scrollY,
      timestamp: Date.now(),
    });

  // ...
  }

  /**
   * Actualiza solo los mensajes, manteniendo el resto del estado
   * Útil cuando llega un nuevo mensaje vía real-time listener
   *
   * @param taskId - ID de la tarea
   * @param messages - Nuevos mensajes
   */
  updateMessages(taskId: string, messages: Message[]): void {
    const entry = this.cache.get(taskId);

    if (entry) {
      entry.messages = messages;
      entry.timestamp = Date.now(); // Refresh TTL
      this.cache.set(taskId, entry);
    }
  }

  /**
   * Actualiza solo la posición del scroll
   * Llamar antes de cambiar de tarea para preservar scroll
   *
   * @param taskId - ID de la tarea
   * @param scrollY - Posición del scroll
   */
  updateScrollPosition(taskId: string, scrollY: number): void {
    const entry = this.cache.get(taskId);

    if (entry) {
      entry.scrollY = scrollY;
      // NO actualizamos timestamp aquí - scroll no debe resetear TTL
      this.cache.set(taskId, entry);
    }
  }

  /**
   * Invalida cache de una tarea específica
   * Útil cuando sabes que los datos cambiaron externamente
   *
   * @param taskId - ID de la tarea
   */
  invalidate(taskId: string): void {
  this.cache.delete(taskId);
  // ...
  }

  /**
   * Limpia todo el cache
   * Útil para logout o cambio de usuario
   */
  clear(): void {
  this.cache.clear();
  // ...
  }

  /**
   * Limpia entradas expiradas
   * Se ejecuta automáticamente cada 5 minutos
   *
   * @returns Número de entradas eliminadas
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [taskId, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;

      if (age > this.TTL_MS) {
        this.cache.delete(taskId);
        removed++;
      }
    }

  // ...

    return removed;
  }

  /**
   * Obtiene estadísticas del cache
   *
   * @returns Estadísticas básicas
   */
  getStats(): CacheStats {
    const timestamps = Array.from(this.cache.values()).map(e => e.timestamp);

    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Inicia limpieza automática cada 5 minutos
   * Solo en browser (no en SSR)
   */
  private startAutoCleanup(): void {
    if (typeof window === 'undefined') return;

    // Limpiar cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * Detiene limpieza automática
   * Útil para testing o cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Instancia global del cache
 * Usa este singleton en toda la app para compartir cache entre componentes
 *
 * @example
 * ```typescript
 * import { chatCache } from './services/simpleChatCache';
 *
 * // Guardar
 * chatCache.set(taskId, messages, lastDoc, hasMore, scrollY);
 *
 * // Obtener
 * const cached = chatCache.get(taskId);
 * if (cached) {
 *   setMessages(cached.messages);
 *   scrollTo(cached.scrollY);
 * }
 *
 * // Actualizar scroll antes de cambiar de tarea
 * chatCache.updateScrollPosition(taskId, container.scrollTop);
 * ```
 */
export const chatCache = new SimpleChatCache();

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Helper: Guarda scroll position antes de cambiar de tarea
 *
 * @param taskId - ID de la tarea actual
 * @param scrollContainer - Elemento contenedor del scroll
 *
 * @example
 * ```typescript
 * // Antes de cambiar de tarea
 * saveScrollBeforeSwitch(currentTaskId, scrollRef.current);
 * ```
 */
export function saveScrollBeforeSwitch(
  taskId: string,
  scrollContainer: HTMLElement | null
): void {
  if (!scrollContainer) return;

  const scrollY = scrollContainer.scrollTop;
  chatCache.updateScrollPosition(taskId, scrollY);

  // ...
}

/**
 * Helper: Restaura scroll position después de cargar mensajes
 *
 * @param scrollContainer - Elemento contenedor del scroll
 * @param scrollY - Posición a restaurar
 *
 * @example
 * ```typescript
 * // Después de setear mensajes del cache
 * restoreScrollPosition(scrollRef.current, cached.scrollY);
 * ```
 */
export function restoreScrollPosition(
  scrollContainer: HTMLElement | null,
  scrollY: number
): void {
  if (!scrollContainer) return;

  // Usar requestAnimationFrame para asegurar que el DOM se actualizó
  requestAnimationFrame(() => {
    scrollContainer.scrollTop = scrollY;
  // ...
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ChatCacheEntry, CacheStats };
export default chatCache;
