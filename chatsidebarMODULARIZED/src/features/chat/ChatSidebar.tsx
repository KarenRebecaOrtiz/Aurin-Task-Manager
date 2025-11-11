"use client"

import type React from "react"
import { useState, useCallback, useMemo, useLayoutEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { useChatStore } from "./stores/chatStore"
import { useMessageActions } from "./hooks/useMessageActions"
import { useMessagePagination } from "./hooks/useMessagePagination"
import { ChatHeader } from "./organisms/ChatHeader"
import { MessageList } from "./organisms/MessageList"
import { InputChat } from "./organisms/InputChat"
import { ImagePreviewOverlay } from "./molecules/ImagePreviewOverlay"
import { RetryModal } from "./molecules/RetryModal"
import type { Task, User } from "./types/chat.types"
import type { Message } from "./types/message.types"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  users: User[]
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, task, users }) => {
  // Auth hook
  const { user } = useUser()

  // Local UI state for timer panel
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false)
  const [timerInput, setTimerInput] = useState("00:00")
  const [dateInput, setDateInput] = useState<Date>(new Date())
  const [commentInput, setCommentInput] = useState("")

  // Modal state
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null)
  const [retryMessage, setRetryMessage] = useState<Message | null>(null)

  const { messages, replyingTo, editingMessage, setReplyingTo, clearActions, setEditingId } = useChatStore((state) => ({
    messages: state.messages,
    replyingTo: state.replyingTo,
    editingMessage: { id: state.editingMessageId, text: "" },
    setReplyingTo: state.setReplyingTo,
    clearActions: state.clearActions,
    setEditingId: state.setEditingId,
  }))

  // Message actions hook
  const { handleSendMessage, handleEditMessage, handleDeleteMessage, handleRetryMessage } = useMessageActions()

  // Message pagination hook
  const { isLoadingMore, hasMore, loadMoreMessages, initialLoad } = useMessagePagination()

  // Timer hook (placeholder - integrate with your useTimerStore)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isRestoringTimer, setIsRestoringTimer] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  // Initialize message loading on mount
  useLayoutEffect(() => {
    initialLoad()
  }, [])

  const totalHours = useMemo(() => {
    return messages.reduce((sum, msg) => {
      // Assuming messages have a 'hours' field for time entries
      return sum + (msg.hours || 0)
    }, 0)
  }, [messages])

  const handleToggleTimer = useCallback(() => {
    if (isTimerRunning) {
      setIsTimerRunning(false)
    } else {
      setIsTimerRunning(true)
    }
  }, [isTimerRunning])

  const handleFinalizeTimerAndSend = useCallback(async () => {
    if (!user?.id) return

    const hours = timerSeconds / 3600
    try {
      await handleSendMessage(
        `Timer entry: ${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`,
        { id: user.id, name: user.firstName || "User", avatarUrl: user.imageUrl },
        undefined,
        undefined,
        undefined,
      )
      setIsTimerRunning(false)
      setTimerSeconds(0)
    } catch (error) {
      console.error("Error finalizing timer:", error)
    }
  }, [timerSeconds, handleSendMessage, user?.id, user?.firstName, user?.imageUrl])

  const handleAddTimeEntry = useCallback(
    async (time: string, date: Date, comment: string) => {
      if (!user?.id) return

      try {
        // Parse time string (e.g., "02:30" = 2.5 hours)
        const [hours, minutes] = time.split(":").map(Number)
        const totalEntryHours = hours + minutes / 60

        await handleSendMessage(
          comment || `Time entry: ${time}`,
          { id: user.id, name: user.firstName || "User", avatarUrl: user.imageUrl },
          undefined,
          undefined,
          undefined,
        )

        // Reset panel state
        setIsTimerPanelOpen(false)
        setTimerInput("00:00")
        setDateInput(new Date())
        setCommentInput("")
      } catch (error) {
        console.error("Error adding time entry:", error)
      }
    },
    [handleSendMessage, user?.id, user?.firstName, user?.imageUrl],
  )

  if (!user) return null

  return (
    <>
      <motion.aside
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? "0%" : "100%" }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex-shrink-0 border-b border-gray-200">
          <ChatHeader task={task} users={users} onClose={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            userId={user.id}
            users={users}
            isLoading={isInitializing}
            hasMore={hasMore}
            loadMoreMessages={loadMoreMessages}
            onSetImagePreview={setImagePreviewSrc}
            onSetRetryMessage={setRetryMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>

        <div className="flex-shrink-0 border-t border-gray-200">
          <InputChat
            currentUser={{ id: user.id, name: user.firstName || "User", avatarUrl: user.imageUrl || undefined }}
            taskId={task.id}
            userId={user.id}
            userFirstName={user.firstName || "User"}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onAddTimeEntry={handleAddTimeEntry}
            replyingTo={replyingTo}
            editingMessageId={editingMessage.id}
            onCancelReply={clearActions}
            onCancelEdit={clearActions}
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning}
            isRestoringTimer={isRestoringTimer}
            isInitializing={isInitializing}
            onToggleTimer={handleToggleTimer}
            onFinalizeTimer={handleFinalizeTimerAndSend}
            onResetTimer={() => setTimerSeconds(0)}
            isTimerPanelOpen={isTimerPanelOpen}
            setIsTimerPanelOpen={setIsTimerPanelOpen}
            timerInput={timerInput}
            setTimerInput={setTimerInput}
            dateInput={dateInput}
            setDateInput={setDateInput}
            commentInput={commentInput}
            setCommentInput={setCommentInput}
            totalHours={totalHours}
          />
        </div>
      </motion.aside>

      <AnimatePresence>
        {imagePreviewSrc && (
          <ImagePreviewOverlay src={imagePreviewSrc || "/placeholder.svg"} onClose={() => setImagePreviewSrc(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {retryMessage && (
          <RetryModal
            message={retryMessage}
            onClose={() => setRetryMessage(null)}
            onRetry={() => {
              handleRetryMessage(retryMessage)
              setRetryMessage(null)
            }}
            onDelete={() => {
              handleDeleteMessage(retryMessage.id)
              setRetryMessage(null)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
