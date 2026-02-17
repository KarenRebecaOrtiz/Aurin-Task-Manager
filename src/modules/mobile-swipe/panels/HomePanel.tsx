'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'
import { useUserDataStore } from '@/stores/userDataStore'
import styles from './HomePanel.module.scss'

export function HomePanel() {
  const userData = useUserDataStore((s) => s.userData)
  const tasks = useDataStore(useShallow((s) => s.tasks))

  const recentTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.archived)
      .sort((a, b) => {
        const dateA = a.lastActivity || a.createdAt
        const dateB = b.lastActivity || b.createdAt
        return dateB.localeCompare(dateA)
      })
      .slice(0, 5)
  }, [tasks])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos dias'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  const firstName = userData?.fullName?.split(' ')[0] || 'Usuario'

  return (
    <div className={styles.panel}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <h1 className={styles.greetingText}>
          {greeting}, <span className={styles.greetingName}>{firstName}</span>
        </h1>
      </div>

      {/* Recent tasks */}
      {recentTasks.length > 0 && (
        <div className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <Clock size={14} />
            <span>Recientes</span>
          </div>
          {recentTasks.map((task, i) => (
            <motion.div
              key={task.id}
              className={styles.recentItem}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className={styles.recentName}>{task.name}</span>
              <span className={styles.recentStatus}>{task.status}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
