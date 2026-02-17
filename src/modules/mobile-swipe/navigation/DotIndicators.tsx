'use client'

import { motion } from 'framer-motion'
import { useMobilePanel, type MobilePanel } from '../hooks/useMobilePanel'
import styles from './DotIndicators.module.scss'

const PANELS: MobilePanel[] = ['tasks', 'home', 'teams']

export function DotIndicators() {
  const activePanel = useMobilePanel((s) => s.activePanel)
  const activeIndex = PANELS.indexOf(activePanel)

  return (
    <div className={styles.dotsContainer}>
      {PANELS.map((panel, i) => (
        <div key={panel} className={styles.dotWrapper}>
          <div className={styles.dot} />
          {i === activeIndex && (
            <motion.div
              className={styles.activeDot}
              layoutId="activeDot"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
