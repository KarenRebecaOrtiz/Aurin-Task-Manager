"use client"

import type React from "react"
import { motion } from "framer-motion"
import type { Message } from "../types/message.types"
import { Icon } from "../atoms/Icon"

interface ReplyPreviewProps {
  message: Message
  onClose: () => void
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({ message, onClose }) => {
  return (
    <motion.div
      className="mb-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg flex items-start justify-between gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Icon name="reply" size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-medium text-blue-700">Replying to {message.senderName}</span>
          <span className="text-xs text-gray-600 truncate">
            {message.text?.slice(0, 50)}
            {message.text && message.text.length > 50 ? "..." : ""}
          </span>
        </div>
      </div>
      <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1">
        <Icon name="close" size={16} />
      </button>
    </motion.div>
  )
}
