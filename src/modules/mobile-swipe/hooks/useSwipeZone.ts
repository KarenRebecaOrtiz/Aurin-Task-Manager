import { useEffect } from 'react'
import type { SwiperClass } from 'swiper/react'

/**
 * Restricts Swiper's touch handling to the bottom 25% of the viewport.
 * Touches in the top 75% are passed through for normal scrolling/interactions.
 */
export function useSwipeZone(swiperInstance: SwiperClass | null) {
  useEffect(() => {
    if (!swiperInstance?.el) return

    const el = swiperInstance.el as HTMLElement

    const handleTouchStart = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY
      const swipeZoneTop = window.innerHeight * 0.75

      // Only allow swipe in bottom 25% of viewport
      swiperInstance.allowTouchMove = touchY >= swipeZoneTop
    }

    const handleTouchEnd = () => {
      // Always reset for next interaction
      swiperInstance.allowTouchMove = true
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [swiperInstance])
}
