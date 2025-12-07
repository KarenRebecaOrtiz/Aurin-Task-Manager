'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { FileText, Mic, Download } from 'lucide-react'
import type { Message } from '../../types'
import { MarkdownRenderer } from '../MarkdownRenderer'
import { formatMessageTime } from '../../utils'
import { messageVariants, bubbleVariants } from '../../lib/animations'
import styles from '../../styles/components/message-bubble.module.scss'

interface MessageBubbleProps {
  message: Message
  avatarUrl?: string
}

export function MessageBubble({ message, avatarUrl }: MessageBubbleProps) {
  const defaultAvatar = 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/android-chrome-192x192.png'

  return (
    <motion.div
      className={`${styles.message} ${message.sender === 'user' ? styles.user : styles.bot}`}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {message.sender === 'bot' && (
        <motion.div className={styles.avatar} variants={bubbleVariants}>
          <Image
            src={avatarUrl || defaultAvatar}
            alt="Bot Avatar"
            width={32}
            height={32}
          />
        </motion.div>
      )}

      <div className={`${styles.messageContent} ${message.sender === 'user' ? styles.user : styles.bot}`}>
        <motion.div
          className={`${styles.bubble} ${message.sender === 'user' ? styles.user : styles.bot}`}
          variants={bubbleVariants}
        >
          {message.sender === 'bot' ? (
            <div className={styles.markdownContent}>
              <MarkdownRenderer content={message.text} />
            </div>
          ) : (
            message.text
          )}

          {message.file && (
            <motion.div
              className={styles.fileAttachment}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {message.file.type.startsWith('image/') ? (
                <motion.img
                  src={message.file.url}
                  alt={message.file.name}
                  whileHover={{ opacity: 0.9 }}
                />
              ) : (
                <div className={styles.fileInfo}>
                  {message.file.type.startsWith('audio/') ? (
                    <Mic size={32} color="#d0df00" />
                  ) : (
                    <FileText size={32} color="#d0df00" />
                  )}
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>{message.file.name}</p>
                    <p className={styles.fileSize}>{message.file.size}</p>
                  </div>
                  <motion.button
                    className={styles.downloadBtn}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download size={16} />
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        <span className={`${styles.timestamp} ${message.sender === 'user' ? styles.user : ''}`}>
          {formatMessageTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  )
}
