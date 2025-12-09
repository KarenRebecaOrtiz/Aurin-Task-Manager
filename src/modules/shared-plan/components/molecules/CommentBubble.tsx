/**
 * CommentBubble - Simple Comment Display
 * 
 * Basado en MessageBubble del n8n-chatbot
 * Muestra un comentario con:
 * - Avatar
 * - Texto
 * - Timestamp
 * - Badge de "Cliente" para comentarios de clientes
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PlanComment } from '../../types'
import styles from '../../styles/CommentBubble.module.scss'

interface CommentBubbleProps {
  comment: PlanComment
  isOwn: boolean
  showAvatar?: boolean
  showName?: boolean
}

const bubbleVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function CommentBubble({
  comment,
  isOwn,
  showAvatar = true,
  showName = true,
}: CommentBubbleProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <motion.div
      className={`${styles.comment} ${isOwn ? styles.own : styles.other}`}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Avatar (solo para mensajes de otros) */}
      {!isOwn && showAvatar && (
        <div className={styles.avatar}>
          <div className={styles.avatarCircle}>
            {getInitials(comment.authorName)}
          </div>
        </div>
      )}

      <div className={styles.commentContent}>
        {/* Nombre del autor */}
        {!isOwn && showName && (
          <div className={styles.authorName}>
            {comment.authorName}
            {comment.authorType === 'client' && (
              <span className={styles.clientBadge}>Cliente</span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className={`${styles.bubble} ${isOwn ? styles.own : styles.other}`}>
          <div className={styles.text}>{comment.message}</div>
        </div>

        {/* Timestamp */}
        <span className={styles.timestamp}>
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
        </span>
      </div>
    </motion.div>
  )
}
