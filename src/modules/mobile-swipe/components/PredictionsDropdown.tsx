'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GradientAvatar } from '@/components/ui/GradientAvatar'
import type { SearchResultItem, SearchResultGroup } from '../hooks/useSpotlightSearch'
import styles from './PredictionsDropdown.module.scss'

interface PredictionsDropdownProps {
  results: SearchResultGroup[]
  visible: boolean
  onItemTap: (item: SearchResultItem) => void
}

const staggerEase = [0.76, 0, 0.24, 1] as const

function ItemAvatar({ item }: { item: SearchResultItem }) {
  if ((item.type === 'user' || item.type === 'team') && item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        className={styles.avatarImage}
      />
    )
  }

  return (
    <GradientAvatar
      seed={item.gradientId || item.id}
      initials={item.name.slice(0, 2).toUpperCase()}
      size="xs"
      className={styles.avatarGradient}
    />
  )
}

export function PredictionsDropdown({ results, visible, onItemTap }: PredictionsDropdownProps) {
  // Flatten items with global index for continuous stagger (max 5 total)
  const flatItems = useMemo(() => {
    const items: { item: SearchResultItem; group: string; globalIndex: number }[] = []
    let idx = 0
    for (const group of results) {
      for (const item of group.items) {
        if (idx >= 3) break
        items.push({ item, group: group.category, globalIndex: idx++ })
      }
      if (idx >= 3) break
    }
    return items
  }, [results])

  // Group items back but keep global index
  const groupedWithIndex = useMemo(() => {
    const map = new Map<string, { item: SearchResultItem; globalIndex: number }[]>()
    for (const entry of flatItems) {
      if (!map.has(entry.group)) map.set(entry.group, [])
      map.get(entry.group)!.push({ item: entry.item, globalIndex: entry.globalIndex })
    }
    return map
  }, [flatItems])

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
              {(groupedWithIndex.get(group.category) || []).map(({ item, globalIndex }) => (
                <motion.button
                  key={item.id}
                  className={styles.item}
                  onClick={() => onItemTap(item)}
                  initial={{ opacity: 0, y: '1.5em' }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: globalIndex * 0.06,
                    ease: staggerEase,
                  }}
                >
                  <span className={styles.itemAvatar}>
                    <ItemAvatar item={item} />
                  </span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.subtitle && (
                      <span className={styles.itemSubtitle}>{item.subtitle}</span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
