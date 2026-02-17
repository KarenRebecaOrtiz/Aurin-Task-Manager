'use client'

import { motion, AnimatePresence } from 'framer-motion'
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

  // Home panel has its own embedded input — no bottom nav needed
  if (activePanel === 'home') return null

  return (
    <div className={styles.bottomNavContainer}>
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
