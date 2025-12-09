/**
 * SharedPlanChat - Full Width Chat Component
 * Arquitectura atómica basada en el módulo de chat
 * 
 * Componentes:
 * - CommentBubble (atom): Mensaje individual
 * - CommentList (molecule): Lista de mensajes
 * - CommentInput (molecule): Input de texto
 * - SharedPlanChat (organism): Chat completo
 */

'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { usePlanComments } from '../../hooks/usePlanComments'
import { CommentBubble } from '../atoms/CommentBubble'
import styles from './SharedPlanChat.module.scss'

interface SharedPlanChatProps {
  planId: string
  token: string
  userName: string
  userId?: string
  userType: 'client' | 'team'
}

export function SharedPlanChat({ 
  planId, 
  token, 
  userName, 
  userId,
  userType 
}: SharedPlanChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [message, setMessage] = React.useState('')

  const {
    comments,
    loading,
    error,
    sending,
    sendComment
  } = usePlanComments({ planId, token, pollInterval: 10000 })

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }, [])

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return

    try {
      await sendComment(message.trim(), userName, userType, userId)
      setMessage('')
      inputRef.current?.focus()
    } catch {
      // Error ya manejado por el hook
    }
  }, [message, sending, sendComment, userName, userType, userId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const groupComments = () => {
    const grouped: {
      comment: typeof comments[0]
      isOwn: boolean
      showAvatar: boolean
      showName: boolean
    }[] = []

    comments.forEach((comment, index) => {
      const prevComment = comments[index - 1]
      const isOwn = userType === 'team' ? comment.authorType === 'team' && comment.authorId === userId : comment.authorType === 'client'
      const prevIsOwn = prevComment ? (userType === 'team' ? prevComment.authorType === 'team' && prevComment.authorId === userId : prevComment.authorType === 'client') : false
      const isSameAuthor = prevComment?.authorId === comment.authorId

      const showAvatar = !prevComment || !isSameAuthor || !prevIsOwn
      const showName = !prevComment || !isSameAuthor || !prevIsOwn

      grouped.push({
        comment,
        isOwn,
        showAvatar,
        showName
      })
    })

    return grouped
  }

  return (
    <div className={styles.chat}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.icon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className={styles.title}>Chat con el Equipo</h3>
            <p className={styles.subtitle}>
              {comments.length} {comments.length === 1 ? 'mensaje' : 'mensajes'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {loading && comments.length === 0 ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando mensajes...</p>
          </div>
        ) : error && comments.length === 0 ? (
          <div className={styles.error}>
            <p>Error al cargar mensajes</p>
            <p className={styles.errorDetail}>{error}</p>
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h8" />
                <path d="M8 14h4" />
              </svg>
            </div>
            <h4>No hay mensajes aún</h4>
            <p>Sé el primero en dejar un comentario</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {groupComments().map(({ comment, isOwn, showAvatar, showName }) => (
              <CommentBubble
                key={comment.id}
                comment={comment}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showName={showName}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={`Escribe un mensaje como ${userName}...`}
            className={styles.input}
            rows={1}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className={styles.sendButton}
            type="button"
          >
            {sending ? (
              <div className={styles.buttonSpinner}></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
          </button>
        </div>
        <p className={styles.hint}>
          Presiona <kbd>Enter</kbd> para enviar, <kbd>Shift + Enter</kbd> para nueva línea
        </p>
      </div>
    </div>
  )
}
