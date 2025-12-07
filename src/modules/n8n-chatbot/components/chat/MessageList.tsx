'use client'

import React, { forwardRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Message } from '../../types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import styles from '../../styles/components/message-list.module.scss'

interface MessageListProps {
  messages: Message[]
  isTyping: boolean
  avatarUrl?: string
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  { messages, isTyping, avatarUrl },
  ref,
) {
  return (
    <div className={styles.messageList}>
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} avatarUrl={avatarUrl} />
        ))}
      </AnimatePresence>

      <AnimatePresence>{isTyping && <TypingIndicator avatarUrl={avatarUrl} />}</AnimatePresence>

      <div ref={ref} />
    </div>
  )
})
