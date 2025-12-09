/**
 * Plan Cache Service
 * 
 * Cache optimizado para planes compartidos públicamente.
 * Basado en SimpleChatCache pero adaptado para el contexto de shared plans.
 * 
 * Características:
 * - Cache de comentarios en memoria (evita polling innecesario)
 * - Scroll position preservation
 * - Auto-limpieza después de 15 minutos de inactividad
 * - Optimistic updates para mejor UX
 * - Deduplicación de requests
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PlanComment, SharedPlanData } from '../types'

// ============================================================================
// TYPES
// ============================================================================

interface PlanCacheEntry {
  plan: SharedPlanData
  comments: PlanComment[]
  scrollY: number
  timestamp: number
  etag?: string // Para validación condicional
}

interface CacheStats {
  size: number
  oldestEntry: number | null
  newestEntry: number | null
}

// Pending requests para evitar duplicados
interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

// ============================================================================
// PLAN CACHE CLASS
// ============================================================================

class PlanCache {
  private cache: Map<string, PlanCacheEntry>
  private pendingRequests: Map<string, PendingRequest>
  private readonly TTL_MS = 15 * 60 * 1000 // 15 minutos
  private readonly REQUEST_DEDUP_MS = 1000 // 1 segundo para deduplicación
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
    this.startAutoCleanup()
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  /**
   * Obtiene plan cacheado
   */
  getPlan(planId: string): SharedPlanData | null {
    const entry = this.cache.get(planId)
    if (!entry) return null

    if (this.isExpired(entry)) {
      this.cache.delete(planId)
      return null
    }

    return entry.plan
  }

  /**
   * Obtiene comentarios cacheados
   */
  getComments(planId: string): PlanComment[] | null {
    const entry = this.cache.get(planId)
    if (!entry) return null

    if (this.isExpired(entry)) {
      this.cache.delete(planId)
      return null
    }

    return entry.comments
  }

  /**
   * Obtiene posición de scroll guardada
   */
  getScrollPosition(planId: string): number {
    const entry = this.cache.get(planId)
    return entry?.scrollY || 0
  }

  /**
   * Obtiene entry completo (para uso interno)
   */
  getEntry(planId: string): PlanCacheEntry | null {
    const entry = this.cache.get(planId)
    if (!entry) return null

    if (this.isExpired(entry)) {
      this.cache.delete(planId)
      return null
    }

    return entry
  }

  // ==========================================================================
  // SETTERS
  // ==========================================================================

  /**
   * Guarda plan en cache
   */
  setPlan(planId: string, plan: SharedPlanData): void {
    const existing = this.cache.get(planId)
    
    this.cache.set(planId, {
      plan,
      comments: existing?.comments || [],
      scrollY: existing?.scrollY || 0,
      timestamp: Date.now(),
      etag: existing?.etag
    })
  }

  /**
   * Guarda comentarios en cache
   */
  setComments(planId: string, comments: PlanComment[]): void {
    const existing = this.cache.get(planId)
    
    if (!existing) {
      console.warn(`[PlanCache] No plan entry found for ${planId}, cannot set comments`)
      return
    }

    existing.comments = comments
    existing.timestamp = Date.now()
    this.cache.set(planId, existing)
  }

  /**
   * Actualiza scroll position
   */
  updateScrollPosition(planId: string, scrollY: number): void {
    const entry = this.cache.get(planId)
    if (entry) {
      entry.scrollY = scrollY
      this.cache.set(planId, entry)
    }
  }

  /**
   * Agrega comentario optimista (antes de confirmación del servidor)
   */
  addOptimisticComment(planId: string, comment: PlanComment): void {
    const entry = this.cache.get(planId)
    if (entry) {
      entry.comments = [...entry.comments, comment]
      entry.timestamp = Date.now()
      this.cache.set(planId, entry)
    }
  }

  /**
   * Reemplaza comentario optimista con el real del servidor
   */
  replaceOptimisticComment(planId: string, tempId: string, realComment: PlanComment): void {
    const entry = this.cache.get(planId)
    if (entry) {
      entry.comments = entry.comments.map(c => 
        c.id === tempId ? realComment : c
      )
      this.cache.set(planId, entry)
    }
  }

  // ==========================================================================
  // DEDUPLICACIÓN DE REQUESTS
  // ==========================================================================

  /**
   * Registra un request pendiente para evitar duplicados
   */
  setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    })

    // Auto-cleanup cuando se resuelva
    promise.finally(() => {
      this.pendingRequests.delete(key)
    })
  }

  /**
   * Obtiene request pendiente si existe (para deduplicación)
   */
  getPendingRequest(key: string): Promise<any> | null {
    const pending = this.pendingRequests.get(key)
    
    if (!pending) return null

    // Si es muy viejo, ignorarlo
    const age = Date.now() - pending.timestamp
    if (age > this.REQUEST_DEDUP_MS) {
      this.pendingRequests.delete(key)
      return null
    }

    return pending.promise
  }

  // ==========================================================================
  // INVALIDACIÓN
  // ==========================================================================

  /**
   * Invalida plan específico
   */
  invalidate(planId: string): void {
    const deleted = this.cache.delete(planId)
    if (deleted) {
      console.log(`[PlanCache] Invalidated plan ${planId}`)
    }
  }

  /**
   * Invalida solo comentarios (útil cuando hay update)
   */
  invalidateComments(planId: string): void {
    const entry = this.cache.get(planId)
    if (entry) {
      entry.comments = []
      this.cache.set(planId, entry)
    }
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.pendingRequests.clear()
    console.log(`[PlanCache] Cleared entire cache (${size} entries)`)
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Verifica si un entry expiró
   */
  private isExpired(entry: PlanCacheEntry): boolean {
    const age = Date.now() - entry.timestamp
    return age > this.TTL_MS
  }

  /**
   * Limpia entradas expiradas
   */
  cleanExpired(): number {
    const now = Date.now()
    let removed = 0

    for (const [planId, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(planId)
        removed++
      }
    }

    // También limpiar pending requests viejos
    for (const [key, pending] of this.pendingRequests.entries()) {
      const age = now - pending.timestamp
      if (age > this.REQUEST_DEDUP_MS * 10) { // 10x el timeout
        this.pendingRequests.delete(key)
      }
    }

    if (removed > 0) {
      console.log(`[PlanCache] Cleaned ${removed} expired entries`)
    }

    return removed
  }

  /**
   * Inicia auto-limpieza periódica
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) return

    // Limpiar cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired()
    }, 5 * 60 * 1000)

    // Cleanup on unload (browser only)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.stopAutoCleanup()
      })
    }
  }

  /**
   * Detiene auto-limpieza
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    const timestamps = Array.from(this.cache.values()).map(e => e.timestamp)

    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    }
  }

  /**
   * Imprime estado del cache (debug)
   */
  debug(): void {
    const stats = this.getStats()
    console.log('[PlanCache] Stats:', {
      ...stats,
      entries: Array.from(this.cache.entries()).map(([id, entry]) => ({
        planId: id,
        commentsCount: entry.comments.length,
        age: Math.round((Date.now() - entry.timestamp) / 1000) + 's',
        scrollY: entry.scrollY
      })),
      pendingRequests: this.pendingRequests.size
    })
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const planCache = new PlanCache()
