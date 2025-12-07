'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { messageVariants, typingDotVariants } from '../../lib/animations'
import styles from '../../styles/components/typing-indicator.module.scss'

interface TypingIndicatorProps {
  avatarUrl?: string
}

export function TypingIndicator({ avatarUrl }: TypingIndicatorProps) {
  const defaultAvatar = 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/android-chrome-192x192.png'

  return (
    <motion.div
      className={styles.typingIndicator}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className={styles.avatar}>
        <Image
          src={avatarUrl || defaultAvatar}
          alt="Bot Avatar"
          width={32}
          height={32}
        />
      </div>
      <div className={styles.bubble}>
        <div className={styles.dots}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className={styles.dot}
              variants={typingDotVariants}
              animate="animate"
              custom={delay}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
