'use client'

import { ClipboardList, Archive } from 'lucide-react'
import { useMobilePanel, type TaskSubView } from '../hooks/useMobilePanel'
import { LiquidGlassFilter } from './LiquidGlassFilter'
import styles from './ContextualBottomNav.module.scss'

const VIEWS: { key: TaskSubView; label: string; icon: React.ReactNode }[] = [
  { key: 'table', label: 'Activas', icon: <ClipboardList size={16} /> },
  { key: 'archive', label: 'Inactivas', icon: <Archive size={16} /> },
]

export function TasksBottomNav() {
  const { taskSubView, setTaskSubView } = useMobilePanel()

  // Map kanban to table since we removed that option
  const activeKey = taskSubView === 'kanban' ? 'table' : taskSubView

  return (
    <>
      {/* SVG filter definition for liquid glass refraction effect */}
      <LiquidGlassFilter width={400} height={56} />
      <div className={styles.segmentedPill}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            className={`${styles.segmentButton} ${activeKey === v.key ? styles.segmentActive : ''}`}
            onClick={() => setTaskSubView(v.key)}
          >
            {v.icon}
            <span>{v.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
