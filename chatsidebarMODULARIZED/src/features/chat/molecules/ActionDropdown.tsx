"use client"

import type React from "react"
import { useEffect, useRef, useState, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { Icon } from "../atoms/Icon"
import type { Message } from "../types/message.types"

interface ActionDropdownProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement>
  message: Message
  userId: string
  onCopy: (text: string) => void
  onEdit: (message: Message) => void
  onDelete: (messageId: string) => void
  onReply: (message: Message) => void
  onDownload: (message: Message) => void
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  message,
  userId,
  onCopy,
  onEdit,
  onDelete,
  onReply,
  onDownload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left,
      })
    }
  }, [isOpen, triggerRef])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target)
      const clickedOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target)

      if (clickedOutsideMenu && clickedOutsideTrigger) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  const isOwnMessage = message.senderId === userId

  const hasDownloadable = !!(message.imageUrl || message.fileUrl)

  const dropdownContent = (
    <motion.div
      ref={menuRef}
      className="z-50 fixed bg-white shadow-xl rounded-lg border border-gray-200 p-2"
      style={{ top: menuPosition.top, left: menuPosition.left }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      <button
        onClick={() => {
          onReply(message)
          onClose()
        }}
        className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-gray-100 text-sm"
      >
        <Icon name="reply" size={16} />
        <span>Reply</span>
      </button>

      <button
        onClick={() => {
          if (message.text) {
            onCopy(message.text)
          }
          onClose()
        }}
        className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-gray-100 text-sm"
      >
        <Icon name="copy" size={16} />
        <span>Copy</span>
      </button>

      {isOwnMessage && (
        <button
          onClick={() => {
            onEdit(message)
            onClose()
          }}
          className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-gray-100 text-sm"
        >
          <Icon name="edit" size={16} />
          <span>Edit</span>
        </button>
      )}

      {isOwnMessage && (
        <button
          onClick={() => {
            onDelete(message.id)
            onClose()
          }}
          className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-red-50 text-sm text-red-600"
        >
          <Icon name="delete" size={16} />
          <span>Delete</span>
        </button>
      )}

      {hasDownloadable && (
        <button
          onClick={() => {
            onDownload(message)
            onClose()
          }}
          className="flex items-center gap-3 w-full text-left p-2 rounded-md hover:bg-gray-100 text-sm"
        >
          <Icon name="download" size={16} />
          <span>Download</span>
        </button>
      )}
    </motion.div>
  )

  return createPortal(dropdownContent, document.body)
}
