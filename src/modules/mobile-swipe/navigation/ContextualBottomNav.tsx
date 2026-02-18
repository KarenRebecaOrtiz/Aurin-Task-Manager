'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useMobilePanel } from '../hooks/useMobilePanel'
import { TasksBottomNav } from './TasksBottomNav'
import { TeamsBottomNav } from './TeamsBottomNav'
import styles from './ContextualBottomNav.module.scss'

const initial = { opacity: 0, y: 20, scale: 0.95 }
const animate = {
  opacity: 1,
  y: 0,
  scale: 1,
  transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const },
}
const exit = {
  opacity: 0,
  y: 12,
  scale: 0.97,
  transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const },
}

export function ContextualBottomNav() {
  const activePanel = useMobilePanel((s) => s.activePanel)
  const scrollDirection = useMobilePanel((s) => s.scrollDirection)
  const pillRef = useRef<HTMLDivElement>(null)
  const pillVisibleRef = useRef(true)

  // Animate pill hide/show based on scroll direction
  useEffect(() => {
    const pill = pillRef.current
    if (!pill || activePanel !== 'tasks') return

    if (scrollDirection === 'down' && pillVisibleRef.current) {
      pillVisibleRef.current = false
      gsap.to(pill, {
        y: '120%',
        autoAlpha: 0,
        duration: 0.45,
        ease: 'power3.inOut',
        overwrite: true,
      })
    } else if (scrollDirection === 'up' && !pillVisibleRef.current) {
      pillVisibleRef.current = true
      gsap.to(pill, {
        y: '0%',
        autoAlpha: 1,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: true,
      })
    }
  }, [scrollDirection, activePanel])

  // Reset pill visibility when switching panels
  useEffect(() => {
    pillVisibleRef.current = true
    if (pillRef.current) {
      gsap.set(pillRef.current, { y: '0%', autoAlpha: 1 })
    }
  }, [activePanel])

  // Home panel has its own embedded input — no bottom nav needed
  if (activePanel === 'home') return null

  return (
    <div ref={pillRef} className={styles.bottomNavContainer}>
      <AnimatePresence mode="wait">
        {activePanel === 'tasks' && (
          <motion.div key="tasks-nav" initial={initial} animate={animate} exit={exit}>
            <TasksBottomNav />
          </motion.div>
        )}
        {activePanel === 'teams' && (
          <motion.div key="teams-nav" initial={initial} animate={animate} exit={exit}>
            <TeamsBottomNav />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
