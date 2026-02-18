'use client'

import { useEffect, useRef } from 'react'
import { useScrollDirectionStore } from '@/stores/scrollDirectionStore'

/**
 * Detects scroll direction from the window AND any overflow container.
 * Uses two strategies:
 *  1. window 'scroll' — catches document-level scroll (table view)
 *  2. document capture-phase 'scroll' — catches overflow containers (kanban columns, etc.)
 *
 * Mount this once at the layout/root level.
 */
export function useScrollWatcher(threshold = 8) {
  const lastWindowY = useRef(0)
  const lastScrollTopMap = useRef(new WeakMap<EventTarget, number>())
  const setScrollDirection = useScrollDirectionStore((s) => s.setScrollDirection)

  useEffect(() => {
    // Strategy 1: window scroll (document-level, e.g. table view)
    const handleWindowScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastWindowY.current

      if (Math.abs(delta) < threshold) return

      if (delta > 0 && currentY > 40) {
        setScrollDirection('down')
      } else if (delta < 0) {
        setScrollDirection('up')
      }

      lastWindowY.current = currentY
    }

    // Strategy 2: capture-phase for overflow containers (kanban columns, etc.)
    const handleCaptureScroll = (e: Event) => {
      const target = e.target
      // Skip document-level scroll (already handled by window listener)
      if (target === document || target === document.documentElement) return
      if (!target || !('scrollTop' in (target as HTMLElement))) return

      const el = target as HTMLElement
      const currentY = el.scrollTop
      const lastY = lastScrollTopMap.current.get(target) ?? 0
      const delta = currentY - lastY

      if (Math.abs(delta) < threshold) {
        lastScrollTopMap.current.set(target, currentY)
        return
      }

      if (delta > 0 && currentY > 40) {
        setScrollDirection('down')
      } else if (delta < 0) {
        setScrollDirection('up')
      }

      lastScrollTopMap.current.set(target, currentY)
    }

    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    document.addEventListener('scroll', handleCaptureScroll, { capture: true, passive: true })

    return () => {
      window.removeEventListener('scroll', handleWindowScroll)
      document.removeEventListener('scroll', handleCaptureScroll, { capture: true })
    }
  }, [threshold, setScrollDirection])
}
