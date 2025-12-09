/**
 * Hook to manage plan comments with caching and optimistic updates
 * 
 * Mejoras vs versión anterior:
 * - Cache en memoria (evita fetches innecesarios)
 * - Optimistic updates (UX instantánea)
 * - Deduplicación de requests
 * - Manejo inteligente de polling
 */

/* eslint-disable no-console */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { PlanComment } from '../types'
import { planCache } from '../services/planCache'

interface UsePlanCommentsProps {
  planId: string
  token: string
  pollInterval?: number // ms, default 10000 (10s)
}

export function usePlanComments({ 
  planId, 
  token,
  pollInterval = 10000 
}: UsePlanCommentsProps) {
  const [comments, setComments] = useState<PlanComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Fetch comments (con cache y deduplicación)
  const fetchComments = useCallback(async (force = false) => {
    // 1. Intentar desde cache primero
    if (!force) {
      const cached = planCache.getComments(planId)
      if (cached) {
        console.log(`[usePlanComments] ⚡ Cache HIT for plan ${planId}`)
        setComments(cached)
        setLoading(false)
        setError(null)
        return cached
      }
    }

    // 2. Verificar si ya hay un request pendiente (deduplicación)
    const requestKey = `comments-${planId}`
    const pending = planCache.getPendingRequest(requestKey)
    if (pending) {
      console.log(`[usePlanComments] 🔄 Deduplicating request for plan ${planId}`)
      return pending
    }

    // 3. Hacer fetch real
    try {
      setLoading(true)
      
      const promise = fetch(`/api/plans/${planId}/comments?token=${token}`)
        .then(async res => {
          if (!res.ok) throw new Error('Error al cargar comentarios')
          return res.json()
        })
        .then(data => {
          if (!isMountedRef.current) return data.comments
          
          const fetchedComments = data.comments || []
          
          // Actualizar cache
          planCache.setComments(planId, fetchedComments)
          
          // Actualizar estado
          setComments(fetchedComments)
          setError(null)
          
          return fetchedComments
        })

      // Registrar como pending
      planCache.setPendingRequest(requestKey, promise)

      return await promise

    } catch (err) {
      if (isMountedRef.current) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMsg)
        console.error('[usePlanComments] Error fetching:', errorMsg)
      }
      return []
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [planId, token])

  // Send comment (con optimistic update)
  const sendComment = useCallback(async (
    message: string, 
    authorName: string, 
    authorType: 'client' | 'team' = 'client', 
    authorId?: string
  ) => {
    try {
      setSending(true)

      // 1. Crear comentario optimista
      const optimisticComment: PlanComment & { isOptimistic?: boolean } = {
        id: `temp-${Date.now()}`,
        taskId: planId,
        message,
        authorName,
        authorType,
        authorId,
        createdAt: new Date().toISOString(),
        isOptimistic: true
      }

      // 2. Actualizar UI inmediatamente
      setComments(prev => [...prev, optimisticComment])
      planCache.addOptimisticComment(planId, optimisticComment)

      // 3. Enviar al servidor
      const response = await fetch(`/api/plans/${planId}/comments?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, authorName, authorType, authorId })
      })

      if (!response.ok) throw new Error('Error al enviar comentario')

      const data = await response.json()
      const realComment = data.comment

      // 4. Reemplazar optimistic con real
      setComments(prev => 
        prev.map(c => c.id === optimisticComment.id ? realComment : c)
      )
      planCache.replaceOptimisticComment(planId, optimisticComment.id, realComment)

      setError(null)
      return realComment

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      
      // Rollback del optimistic update
      await fetchComments(true)
      
      throw err
    } finally {
      setSending(false)
    }
  }, [planId, token, fetchComments])

  // Polling
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return

    pollTimerRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchComments(false)
      }
    }, pollInterval)

    console.log(`[usePlanComments] Started polling (interval: ${pollInterval}ms)`)
  }, [pollInterval, fetchComments])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
      console.log('[usePlanComments] Stopped polling')
    }
  }, [])

  // Lifecycle
  useEffect(() => {
    isMountedRef.current = true
    
    fetchComments()
    startPolling()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        fetchComments(false)
        startPolling()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      isMountedRef.current = false
      stopPolling()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [fetchComments, startPolling, stopPolling])

  return {
    comments,
    loading,
    error,
    sending,
    sendComment,
    refresh: () => fetchComments(true),
    invalidate: () => planCache.invalidateComments(planId)
  }
}
