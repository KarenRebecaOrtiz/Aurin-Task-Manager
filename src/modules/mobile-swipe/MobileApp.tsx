'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { SwiperClass } from 'swiper/react'
import { useMobilePanel } from './hooks/useMobilePanel'
import { useSwipeZone } from './hooks/useSwipeZone'
import { TasksPanel } from './panels/TasksPanel'
import { HomePanel } from './panels/HomePanel'
import { TeamsPanel } from './panels/TeamsPanel'
import { ContextualBottomNav } from './navigation/ContextualBottomNav'
import { DotIndicators } from './navigation/DotIndicators'
import { MobileHeader } from './header/MobileHeader'
import { MobileFab } from './header/MobileFab'
import styles from './MobileApp.module.scss'

import 'swiper/css'

const PANEL_MAP = ['tasks', 'home', 'teams'] as const

export function MobileApp() {
  const [mounted, setMounted] = useState(false)
  const [swiperInstance, setSwiperInstance] = useState<SwiperClass | null>(null)
  const { activePanel, setActivePanel } = useMobilePanel()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Restrict swipe to bottom 25% of viewport
  useSwipeZone(swiperInstance)

  const handleSlideChange = useCallback((swiper: SwiperClass) => {
    const panel = PANEL_MAP[swiper.activeIndex]
    if (panel) setActivePanel(panel)
  }, [setActivePanel])

  if (!mounted || typeof window === 'undefined') return null

  const app = (
    <div className={styles.mobileApp}>
      {/* Header - solo visible en Home */}
      <MobileHeader />

      {/* FAB - visible en Tasks y Teams */}
      <MobileFab />

      {/* Swiper container */}
      <Swiper
        onSwiper={setSwiperInstance}
        onSlideChange={handleSlideChange}
        slidesPerView={1}
        initialSlide={1}
        speed={300}
        threshold={15}
        resistance
        resistanceRatio={0.85}
        touchMoveStopPropagation
        cssMode={false}
        className={styles.swiperContainer}
      >
        <SwiperSlide className={styles.slide}>
          <TasksPanel />
        </SwiperSlide>
        <SwiperSlide className={styles.slide}>
          <HomePanel />
        </SwiperSlide>
        <SwiperSlide className={styles.slide}>
          <TeamsPanel />
        </SwiperSlide>
      </Swiper>

      {/* Dot indicators */}
      <DotIndicators />

      {/* Contextual bottom navigation */}
      <ContextualBottomNav />
    </div>
  )

  return createPortal(app, document.body)
}

export default MobileApp
