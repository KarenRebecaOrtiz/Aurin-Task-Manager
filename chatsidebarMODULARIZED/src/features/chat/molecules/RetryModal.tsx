"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import ReactDOM from "react-dom"
import type { Message } from "../types/message.types"
import { Icon } from "../atoms/Icon"

interface RetryModalProps {
  isOpen: boolean
  message: Message
  onClose: () => void
  onRetry: (message: Message) => void
}

export const RetryModal = ({ isOpen, message, onClose, onRetry }: RetryModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = "unset"
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const portal = ReactDOM.createPortal(
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Icon name="alert-circle" size={24} className="text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Error sending message</h3>
        </div>

        {/* Message Preview */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <p className="text-sm text-gray-700 line-clamp-3">{message.text}</p>
        </div>

        {/* Retry Message */}
        <p className="text-sm text-gray-600 mb-6">Do you want to retry sending this message or delete it?</p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => {
              onRetry(message)
            }}
            className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )

  return portal
}
