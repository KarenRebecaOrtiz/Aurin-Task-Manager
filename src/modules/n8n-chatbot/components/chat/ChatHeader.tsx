'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { headerVariants } from '../../lib/animations'
import styles from '../../styles/components/chat-header.module.scss'

interface ChatHeaderProps {
  title: string
  onMinimize: () => void
  minimizeLabel: string
  avatarUrl?: string
  isMobile?: boolean
}

export function ChatHeader({ title, onMinimize, minimizeLabel, avatarUrl, isMobile }: ChatHeaderProps) {
  const defaultAvatar = 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/android-chrome-192x192.png'

  return (
    <motion.div className={styles.header} variants={headerVariants} initial="hidden" animate="visible">
      <div className={styles.headerInfo}>
        <motion.div
          className={styles.avatar}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Image src={avatarUrl || defaultAvatar} alt="Bot Avatar" width={40} height={40} />
        </motion.div>
        <div className={styles.titleContainer}>
          <h3 className={styles.title}>{title}</h3>
        </div>
      </div>
      <motion.button
        onClick={onMinimize}
        className={styles.minimizeBtn}
        aria-label={minimizeLabel}
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
        whileTap={{ scale: 0.95 }}
      >
        <ChevronDown size={20} color="white" />
      </motion.button>
    </motion.div>
  )
}
