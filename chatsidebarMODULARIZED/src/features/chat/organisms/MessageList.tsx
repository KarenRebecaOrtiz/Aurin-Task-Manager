"use client"

import React, { useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import { MessageItem } from "./MessageItem"
import { DatePill } from "../atoms/DatePill"
import { LoadMoreButton } from "../atoms/LoadMoreButton"
import { AISummaryMessage } from "../molecules/AISummaryMessage"
import { useChatStore } from "../stores/chatStore"
import { useMessagePagination } from "../hooks/useMessagePagination"
import type { Message } from "../types/message.types"

interface MessageListProps {
  currentUserId: string
  onImagePreview?: (src: string) => void
  onRetryMessage?: (message: Message) => void
}

export const MessageList: React.FC<MessageListProps> = ({ currentUserId, onImagePreview, onRetryMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { messages } = useChatStore()
  const { loadMoreMessages, initialLoad, isLoadingMore, hasMoreMessages } = useMessagePagination()

  // Initial load
  useEffect(() => {
    initialLoad()
  }, [initialLoad])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate?.() || new Date()
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  // Group messages by date
  const groupedMessages: Array<{ date: string; messages: typeof messages }> = []
  let currentDate = ""

  messages.forEach((message) => {
    const messageDate = formatDate(message.timestamp)

    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: messageDate, messages: [] })
    }

    groupedMessages[groupedMessages.length - 1].messages.push(message)
  })

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
      <LoadMoreButton onClick={loadMoreMessages} isLoading={isLoadingMore} hasMore={hasMoreMessages} />

      <AnimatePresence initial={false}>
        {groupedMessages.map((group) => (
          <React.Fragment key={group.date}>
            <DatePill date={group.date} />
            {group.messages.map((message) =>
              message.isAISummary && message.text ? (
                <AISummaryMessage key={message.id} content={message.text} />
              ) : (
                <MessageItem
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  onImagePreview={onImagePreview}
                  onRetryMessage={onRetryMessage}
                />
              ),
            )}
          </React.Fragment>
        ))}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  )
}
