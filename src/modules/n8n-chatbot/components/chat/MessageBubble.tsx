'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { FileText, Mic, Download, FileImage, FileArchive, File } from 'lucide-react'
import type { Message } from '../../types'
import { MarkdownRenderer } from '../MarkdownRenderer'
import { formatMessageTime } from '../../utils'
import { messageVariants, bubbleVariants } from '../../lib/animations'
import styles from '../../styles/components/message-bubble.module.scss'

interface MessageBubbleProps {
  message: Message
  avatarUrl?: string
}

/**
 * Get the appropriate icon for a file type
 */
function getFileIcon(fileType: string) {
  if (fileType.startsWith('audio/')) {
    return Mic
  }
  if (fileType.startsWith('image/')) {
    return FileImage
  }
  if (fileType.includes('pdf')) {
    return FileText
  }
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar') || fileType.includes('gz')) {
    return FileArchive
  }
  return File
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
                  <div className={styles.fileIcon}>
                    {React.createElement(getFileIcon(message.file.type), { size: 24 })}
                  </div>
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>{message.file.name}</p>
                    <p className={styles.fileSize}>{message.file.size}</p>
                  </div>
                  <motion.a
                    href={message.file.url}
                    download={message.file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadBtn}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={18} />
                  </motion.a>
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
