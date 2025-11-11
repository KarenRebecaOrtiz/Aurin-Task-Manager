"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useChatStore } from "../stores/chatStore"
import { ReplyPreview } from "./ReplyPreview"
import { useMessageActions } from "../hooks/useMessageActions"

interface InputChatProps {
  currentUser: {
    id: string
    name: string
    avatarUrl?: string
  }
}

export const InputChat: React.FC<InputChatProps> = ({ currentUser }) => {
  const [text, setText] = useState("")

  const replyingTo = useChatStore((state) => state.replyingTo)
  const editingMessageId = useChatStore((state) => state.editingMessageId)
  const messages = useChatStore((state) => state.messages)
  const clearActions = useChatStore((state) => state.clearActions)

  // Get action handlers
  const { handleSendMessage, handleEditMessage } = useMessageActions()

  // Find the editing message from the store
  const editingMessage = editingMessageId ? messages.find((msg) => msg.id === editingMessageId) : null

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "")
    }
  }, [editingMessage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim() === "") return

    if (editingMessage) {
      handleEditMessage(editingMessage.id, text)
    } else {
      handleSendMessage(text, currentUser)
    }

    // Reset state
    setText("")
    clearActions()
  }

  return (
    <div className="border-t border-border bg-background">
      {/* Show reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <ReplyPreview message={replyingTo} onClose={clearActions} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show editing state */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-2 text-sm bg-yellow-100 text-yellow-800 flex justify-between items-center"
          >
            <span>✏️ Editing message...</span>
            <button onClick={clearActions} className="font-bold text-xs hover:underline">
              CANCEL
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="flex items-end p-4 gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 resize-none border border-gray-300 rounded-lg p-2 max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = "auto"
            target.style.height = `${target.scrollHeight}px`
          }}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          disabled={text.trim() === ""}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  )
}
