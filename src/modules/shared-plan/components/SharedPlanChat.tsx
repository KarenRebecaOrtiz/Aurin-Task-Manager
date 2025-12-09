/**
 * SharedPlanChat - Full Width Chat for Public Plans
 * 
 * Replica EXACTA de ChatSidebar pero adaptada a full-width.
 * Reutiliza toda la arquitectura modular del módulo de chat.
 */

'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { usePlanComments } from '../hooks/usePlanComments'
import { SharedPlanChatHeader } from './SharedPlanChatHeader'
import { SharedPlanMessageList } from './SharedPlanMessageList'
import { SharedPlanInput } from './SharedPlanInput'
import styles from './SharedPlanChat.module.scss'

export interface SharedPlanChatProps {
  planId: string
  token: string
  userName: string
  userId?: string
  userType: 'client' | 'team'
}

/**
 * SharedPlanChat Component
 * 
 * Full-width version of ChatSidebar for public shared plans.
 * Uses same modular architecture:
 * - Header (with plan info)
 * - MessageList (virtualized with infinite scroll)
 * - Input (with TipTap editor)
 */
export const SharedPlanChat: React.FC<SharedPlanChatProps> = ({
  planId,
  token,
  userName,
  userId,
  userType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Hook de comentarios con cache y optimistic UI
  const {
    comments,
    loading,
    error,
    sending,
    sendComment,
    refresh,
  } = usePlanComments(planId, token, userName, userId, userType)

  // Estados locales para reply/edit
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null)

  // Handlers
  const handleSendMessage = useCallback(async (message: { text: string }) => {
    await sendComment(message.text, replyingTo?.id)
    setReplyingTo(null)
  }, [sendComment, replyingTo])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingText('')
  }, [])

  // No hay tarea, pero usamos un objeto similar para compatibilidad
  const planInfo = useMemo(() => ({
    id: planId,
    name: 'Plan Compartido',
    description: '',
  }), [planId])

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <SharedPlanChatHeader
          planId={planId}
          messageCount={comments.length}
          loading={loading}
        />
      </div>

      {/* Content (Messages) */}
      <div className={styles.content}>
        <SharedPlanMessageList
          comments={comments}
          loading={loading}
          error={error}
          userType={userType}
          userId={userId}
          onImagePreview={(url) => setImagePreviewSrc(url)}
          onReply={(comment) => setReplyingTo(comment)}
          onEdit={(comment) => {
            setEditingMessageId(comment.id)
            setEditingText(comment.text || '')
          }}
        />
      </div>

      {/* Input Area */}
      <div className={styles.inputArea}>
        <SharedPlanInput
          planId={planId}
          userId={userId || ''}
          userName={userName}
          onSendMessage={handleSendMessage}
          isSending={sending}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          editingMessageId={editingMessageId}
          editingText={editingText}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      {/* Image Preview Overlay */}
      {imagePreviewSrc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 100002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setImagePreviewSrc(null)}
        >
          <img
            src={imagePreviewSrc}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  )
}
