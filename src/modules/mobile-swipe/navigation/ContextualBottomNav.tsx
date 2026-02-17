'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMobilePanel } from '../hooks/useMobilePanel'
import { TasksBottomNav } from './TasksBottomNav'
import { SmartInput } from '../components/SmartInput'
import { TeamsBottomNav } from './TeamsBottomNav'
import styles from './ContextualBottomNav.module.scss'

const initial = { opacity: 0, y: 8 }
const animate = {
  opacity: 1,
  y: 0,
  transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const },
}
const exit = {
  opacity: 0,
  y: -4,
  transition: { duration: 0.15 },
}

export function ContextualBottomNav() {
  const activePanel = useMobilePanel((s) => s.activePanel)

  return (
    <div className={styles.bottomNavContainer}>
      <AnimatePresence mode="wait">
        {activePanel === 'tasks' && (
          <motion.div key="tasks-nav" initial={initial} animate={animate} exit={exit}>
            <TasksBottomNav />
          </motion.div>
        )}
        {activePanel === 'home' && (
          <motion.div key="home-nav" initial={initial} animate={animate} exit={exit}>
            <SmartInput />
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
