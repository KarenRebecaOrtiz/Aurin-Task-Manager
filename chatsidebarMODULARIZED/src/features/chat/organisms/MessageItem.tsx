"use client"

import type React from "react"
import { useState, forwardRef, memo, useRef } from "react"
import { motion, useDragControls, AnimatePresence } from "framer-motion"
import sanitizeHtml from "sanitize-html"
import { UserAvatar } from "../atoms/UserAvatar"
import { Icon } from "../atoms/Icon"
import { ActionDropdown } from "../molecules/ActionDropdown"
import { ImagePreviewOverlay } from "../molecules/ImagePreviewOverlay"
import { ReplyPreview } from "../molecules/ReplyPreview"
import type { Message, User } from "../types/message.types"
import { useMessageActions } from "../hooks/useMessageActions"

interface MessageItemProps {
  message: Message
  userId: string
  users: User[]
  isOwn: boolean
  onImagePreview?: (src: string) => void
  onRetryMessage?: (message: Message) => void
}

const markdownToHtml = (text: string): string => {
  let html = text

  // Convert **bold**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

  // Convert *italic*
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")

  // Convert • lists
  html = html.replace(/^• (.+)$/gm, "<li>$1</li>")
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")

  // Convert line breaks
  html = html.replace(/\n/g, "<br>")

  // Sanitize the HTML
  return sanitizeHtml(html, {
    allowedTags: ["b", "strong", "em", "i", "ul", "li", "br"],
    allowedAttributes: {},
  })
}

export const MessageItem = memo(
  forwardRef<HTMLDivElement, MessageItemProps>(
    ({ message, userId, users, isOwn, onImagePreview, onRetryMessage }, ref) => {
      const actionButtonRef = useRef<HTMLButtonElement>(null)
      const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
      const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false) // Declare setIsImagePreviewOpen here
      const dragControls = useDragControls()

      const { handleDeleteMessage, handleRetryMessage, setEditingId, setReplyingTo } = useMessageActions()

      const handleEllipsisClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsActionMenuOpen(true)
      }

      const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text)
      }

      const handleEdit = (message: Message) => {
        setEditingId(message.id)
      }

      const handleDelete = (messageId: string) => {
        if (confirm("Are you sure you want to delete this message?")) {
          handleDeleteMessage(messageId)
        }
      }

      const handleReply = (message: Message) => {
        setReplyingTo(message)
      }

      const handleDownload = (message: Message) => {
        const url = message.imageUrl || message.fileUrl
        if (url) {
          const link = document.createElement("a")
          link.href = url
          link.download = message.fileName || "download"
          link.click()
        }
      }

      const handleDragEnd = (_event: any, info: any) => {
        if (info.offset.x < -100) {
          setReplyingTo(message)
        }
      }

      const formatTime = (timestamp: any) => {
        const date = timestamp?.toDate?.() || new Date()
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      }

      const renderMessageContent = () => {
        return (
          <>
            {/* Reply Preview - shown above main content if exists */}
            {message.replyTo && <ReplyPreview message={message.replyTo} onClose={() => {}} />}

            {/* Text & Markdown */}
            {message.text && (
              <div
                className="text-sm text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(message.text) }}
              />
            )}

            {/* Image */}
            {message.imageUrl && (
              <img
                src={message.imageUrl || "/placeholder.svg"}
                alt="Message attachment"
                className="rounded-md max-w-xs cursor-pointer mt-2"
                onClick={handleImageClick}
              />
            )}

            {/* File */}
            {message.fileUrl && (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md mt-2">
                <Icon name="file" size={16} className="text-gray-600" />
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex-1 truncate"
                >
                  {message.fileName || "Download file"}
                </a>
              </div>
            )}

            {/* Time Log - special format for hours tracking */}
            {(message as any).hours && (
              <div className="flex items-center text-sm text-blue-600 font-medium mt-1">
                <Icon name="clock" size={16} className="mr-1" />
                <span>{(message as any).hours} hours logged</span>
              </div>
            )}
          </>
        )
      }

      const renderStatus = () => {
        if (message.isPending) {
          return <span className="text-xs text-gray-400">Pending...</span>
        }

        if (message.hasError && isOwn) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Error</span>
              <button
                onClick={() => handleRetry(message)}
                className="ml-2 text-blue-500 text-xs font-semibold hover:underline"
              >
                Retry
              </button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-1">
            <Icon name="check" size={12} className="text-green-500" />
            <span className="text-xs text-gray-500">Sent</span>
          </div>
        )
      }

      const handleRetry = (msg: Message) => {
        if (onRetryMessage) {
          onRetryMessage(msg)
        } else {
          handleRetryMessage(msg)
        }
      }

      const handleImageClick = () => {
        if (onImagePreview && message.imageUrl) {
          onImagePreview(message.imageUrl)
        } else {
          setIsImagePreviewOpen(true)
        }
      }

      return (
        <>
          <motion.div
            ref={ref}
            className="flex gap-3 p-3 w-full rounded-lg hover:bg-gray-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            drag="x"
            dragConstraints={{ left: -150, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            dragControls={dragControls}
          >
            {/* Left Side: UserAvatar */}
            <div className="flex-shrink-0">
              <UserAvatar src={message.senderAvatarUrl} alt={message.senderName} size="medium" />
            </div>

            {/* Right Side: Message Content */}
            <div className="flex-1 flex flex-col">
              {/* Header: sender name, timestamp, and actions */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">{message.senderName}</span>
                  <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                </div>

                <button
                  ref={actionButtonRef}
                  onClick={handleEllipsisClick}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Message actions"
                >
                  <Icon name="ellipsis" size={16} className="text-gray-500" />
                </button>
              </div>

              {/* Main message content */}
              <div className="mb-2">{renderMessageContent()}</div>

              {/* Status at bottom */}
              <div className="flex items-center">{renderStatus()}</div>
            </div>
          </motion.div>

          <AnimatePresence>
            {isActionMenuOpen && (
              <ActionDropdown
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                triggerRef={actionButtonRef}
                message={message}
                userId={userId}
                users={users}
                onReply={handleReply}
                onCopy={handleCopy}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            )}
          </AnimatePresence>

          {/* Image Preview Overlay */}
          {isImagePreviewOpen && (
            <ImagePreviewOverlay
              imageUrl={message.imageUrl || "/placeholder.svg"}
              onClose={() => setIsImagePreviewOpen(false)}
            />
          )}
        </>
      )
    },
  ),
)

MessageItem.displayName = "MessageItem"
