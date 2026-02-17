'use client'

import { motion, AnimatePresence } from 'framer-motion'
import styles from './PredictionsDropdown.module.scss'

interface SearchResultItem {
  id: string
  name: string
  subtitle?: string
  icon: React.ReactNode
  onTap: () => void
}

interface SearchResultGroup {
  category: string
  items: SearchResultItem[]
}

interface PredictionsDropdownProps {
  results: SearchResultGroup[]
  visible: boolean
  onItemTap: (item: SearchResultItem) => void
}

export function PredictionsDropdown({ results, visible, onItemTap }: PredictionsDropdownProps) {
  return (
    <AnimatePresence>
      {visible && results.length > 0 && (
        <motion.div
          className={styles.dropdown}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
        >
          {results.map((group) => (
            <div key={group.category} className={styles.group}>
              <span className={styles.category}>{group.category}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={styles.item}
                  onClick={() => onItemTap(item)}
                >
                  <span className={styles.itemIcon}>{item.icon}</span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.subtitle && (
                      <span className={styles.itemSubtitle}>{item.subtitle}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
