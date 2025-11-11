"use client"

import { useCallback } from "react"
import { useChatStore } from "../stores/chatStore"
import { firebaseService } from "../services/firebaseService"
import type { Message } from "../types/message.types"
import { Timestamp } from "firebase/firestore"

export function useMessageActions() {
  const { addMessage, updateMessage, deleteMessage, setEditingId, setReplyingTo, editingMessageId, replyingTo } =
    useChatStore()

  const handleSendMessage = useCallback(
    async (
      text: string,
      currentUser: { id: string; name: string; avatarUrl?: string },
      imageUrl?: string,
      fileUrl?: string,
      fileName?: string,
    ) => {
      if (!text.trim() && !imageUrl && !fileUrl) return

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatarUrl: currentUser.avatarUrl,
        text: text.trim(),
        timestamp: Timestamp.now(),
        imageUrl,
        fileUrl,
        fileName,
        replyTo: replyingTo || undefined,
        isPending: true,
      }

      // Add optimistic message to store
      addMessage(optimisticMessage)

      try {
        // Send to Firebase
        const messageId = await firebaseService.sendMessage({
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatarUrl: currentUser.avatarUrl,
          text: text.trim(),
          imageUrl,
          fileUrl,
          fileName,
          replyTo: replyingTo || undefined,
        })

        // Update with real ID and remove pending status
        updateMessage(optimisticMessage.id, {
          id: messageId,
          isPending: false,
        })

        // Clear reply state
        setReplyingTo(null)
      } catch (error) {
        console.error("Error sending message:", error)
        // Mark message as errored
        updateMessage(optimisticMessage.id, {
          isPending: false,
          hasError: true,
        })
      }
    },
    [addMessage, replyingTo, setReplyingTo, updateMessage],
  )

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!newText.trim()) return

      try {
        // Optimistically update the message
        updateMessage(messageId, { text: newText.trim() })

        // Update in Firebase
        await firebaseService.updateMessage(messageId, {
          text: newText.trim(),
        })

        // Clear editing state
        setEditingId(null)
      } catch (error) {
        console.error("Error editing message:", error)
        // Revert the change or show error
      }
    },
    [setEditingId, updateMessage],
  )

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        // Optimistically remove from UI
        deleteMessage(messageId)

        // Delete from Firebase
        await firebaseService.deleteMessage(messageId)
      } catch (error) {
        console.error("Error deleting message:", error)
        // Optionally restore the message
      }
    },
    [deleteMessage],
  )

  const handleRetryMessage = useCallback(
    async (message: Message) => {
      // Clear error state
      updateMessage(message.id, { hasError: false, isPending: true })

      try {
        const messageId = await firebaseService.sendMessage({
          senderId: message.senderId,
          senderName: message.senderName,
          senderAvatarUrl: message.senderAvatarUrl,
          text: message.text,
          imageUrl: message.imageUrl,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          replyTo: message.replyTo,
        })

        updateMessage(message.id, {
          id: messageId,
          isPending: false,
        })
      } catch (error) {
        console.error("Error retrying message:", error)
        updateMessage(message.id, {
          isPending: false,
          hasError: true,
        })
      }
    },
    [updateMessage],
  )

  return {
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleRetryMessage,
    editingMessageId,
    replyingTo,
    setEditingId,
    setReplyingTo,
  }
}
