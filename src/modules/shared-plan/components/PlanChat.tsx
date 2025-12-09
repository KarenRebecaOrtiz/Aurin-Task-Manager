/**
 * Plan Chat Component
 * Displays chat messages for shared plans
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePlanComments } from '../hooks/usePlanComments'
import { ArrowUp } from 'lucide-react'

interface PlanChatProps {
  planId: string
  token: string
  userName?: string
  userId?: string
}

export function PlanChat({
  planId,
  token,
  userName,
  userId
}: PlanChatProps) {
  const { comments, loading, sending, sendComment } = usePlanComments({ planId, token })
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || sending) return

    const message = inputValue.trim()
    setInputValue('')

    const authorName = userName || 'Invitado'
    const authorType = userId ? 'team' : 'client'

    const result = await sendComment(message, authorName, authorType, userId)

    if (!result.success) {
      setInputValue(message)
    }
  }, [inputValue, sending, sendComment, userName, userId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-card">
        <h2 className="text-xl font-semibold">💬 Chat con el Equipo</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Comparte tus dudas y comentarios aquí
        </p>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg">👋 ¡Inicia la conversación!</p>
            <p className="text-sm mt-2">Envía un mensaje al equipo</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isTeam = comment.authorType === 'team'
            return (
              <div
                key={comment.id}
                className={`flex ${isTeam ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[70%] ${isTeam ? 'order-1' : 'order-2'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      isTeam
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {comment.message}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t px-6 py-4 bg-card">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Escribe tu mensaje..."
            className="flex-1 min-h-[44px] max-h-32 px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sending}
            className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
        {!userId && (
          <p className="text-xs text-muted-foreground mt-2">
            Comentando como: <span className="font-medium">{userName || 'Invitado'}</span>
          </p>
        )}
      </div>
    </div>
  )
}


