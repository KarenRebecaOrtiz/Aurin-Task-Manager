/**
 * CommentBubble Atom - Individual comment message
 * Basado en MessageItem pero simplificado para shared plans
 */

'use client'

import React, { memo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PlanComment } from '../../types'
import styles from './CommentBubble.module.scss'

interface CommentBubbleProps {
  comment: PlanComment & { isOptimistic?: boolean }
  isOwn: boolean
  showAvatar?: boolean
  showName?: boolean
}

export const CommentBubble = memo(({ 
  comment, 
  isOwn, 
  showAvatar = true,
  showName = true 
}: CommentBubbleProps) => {
  const formattedTime = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: es
  })

  const initials = comment.authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div 
      className={`${styles.comment} ${isOwn ? styles.own : styles.other} ${comment.isOptimistic ? styles.optimistic : ''}`}
      data-comment-id={comment.id}
    >
      {/* Avatar (solo para mensajes de otros) */}
      {!isOwn && showAvatar && (
        <div className={styles.avatar}>
          <span className={styles.initials}>{initials}</span>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* Author name (solo para mensajes de otros) */}
        {!isOwn && showName && (
          <div className={styles.authorName}>
            {comment.authorName}
            {comment.authorType === 'client' && (
              <span className={styles.badge}>Cliente</span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className={styles.bubble}>
          <div className={styles.text}>{comment.message}</div>
          
          {/* Timestamp */}
          <div className={styles.timestamp}>
            {formattedTime}
            {comment.isOptimistic && (
              <span className={styles.sending}>Enviando...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

CommentBubble.displayName = 'CommentBubble'
