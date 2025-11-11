"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import sanitizeHtml from "sanitize-html"
import Image from "next/image"
import { useChatStore } from "../stores/chatStore"
import { useImageUpload } from "../hooks/useImageUpload"
import { useMessageActions } from "../hooks/useMessageActions"
import { ReplyPreview } from "../molecules/ReplyPreview"
import { TimerDisplay } from "../molecules/TimerDisplay"
import { TimerPanel } from "../molecules/TimerPanel"
import { EmojiSelector } from "../atoms/EmojiSelector"

interface InputChatProps {
  currentUser: {
    id: string
    name: string
    avatarUrl?: string
  }
}

export const InputChat: React.FC<InputChatProps> = ({ currentUser }) => {
  // File upload state
  const { file, previewUrl, handleFileChange, handleDrop, handleRemove } = useImageUpload()

  // Editor state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // UI state
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false)
  const [isDropupOpen, setIsDropupOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasReformulated, setHasReformulated] = useState(false)
  const [reformHistory, setReformHistory] = useState<string[]>([])

  // Timer state (placeholder)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isRestoringTimer, setIsRestoringTimer] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false)
  const [timerInput, setTimerInput] = useState("")
  const [dateInput, setDateInput] = useState<Date>()
  const [commentInput, setCommentInput] = useState("")

  // Store hooks
  const replyingTo = useChatStore((state) => state.replyingTo)
  const editingMessageId = useChatStore((state) => state.editingMessageId)
  const messages = useChatStore((state) => state.messages)
  const clearActions = useChatStore((state) => state.clearActions)

  // Message actions
  const { handleSendMessage, handleEditMessage } = useMessageActions()

  // Find editing message
  const editingMessage = editingMessageId ? messages.find((msg) => msg.id === editingMessageId) : null

  // Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: editingMessage?.text || "",
    onUpdate: ({ editor }) => {
      adjustEditorHeight()
    },
  })

  // Adjust editor height
  const adjustEditorHeight = useCallback(() => {
    if (!editorContainerRef.current) return
    const element = editorContainerRef.current.querySelector(".ProseMirror")
    if (element) {
      element.style.height = "auto"
      element.style.height = `${Math.min(element.scrollHeight, 200)}px`
    }
  }, [])

  // Update editor when editing message changes
  useEffect(() => {
    if (editingMessage && editor) {
      editor.commands.setContent(editingMessage.text || "")
      adjustEditorHeight()
    }
  }, [editingMessage, editor, adjustEditorHeight])

  // Handle file input
  const handleThumbnailClick = () => {
    fileInputRef.current?.click()
  }

  // Handle send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    const content = editor?.getHTML() || ""
    const cleanContent = sanitizeHtml(content)
    const hasText = cleanContent.trim() !== "" && cleanContent !== "<p></p>"
    const hasFile = !!file

    if (!hasText && !hasFile) return

    try {
      setIsProcessing(true)

      if (editingMessage) {
        await handleEditMessage(editingMessage.id, cleanContent)
      } else {
        await handleSendMessage(cleanContent, currentUser)
      }

      // Clear state
      editor?.commands.clearContent(true)
      handleRemove()
      clearActions()
      setReformHistory([])
      setHasReformulated(false)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle reformulate (placeholder)
  const handleReformulate = () => {
    setIsProcessing(true)
    // Placeholder for AI reformulation
    setTimeout(() => {
      setIsProcessing(false)
      setHasReformulated(true)
    }, 500)
  }

  // Handle undo reformulation
  const handleUndoReformulation = () => {
    if (reformHistory.length > 0) {
      const previousText = reformHistory[reformHistory.length - 1]
      editor?.commands.setContent(previousText)
      setReformHistory(reformHistory.slice(0, -1))
      if (reformHistory.length === 1) {
        setHasReformulated(false)
      }
    }
  }

  // Handle toggle format
  const handleToggleFormat = (format: string) => {
    if (!editor) return

    switch (format) {
      case "bold":
        editor.chain().focus().toggleBold().run()
        break
      case "italic":
        editor.chain().focus().toggleItalic().run()
        break
      case "underline":
        editor.chain().focus().toggleUnderline().run()
        break
      case "code":
        editor.chain().focus().toggleCode().run()
        break
      case "bulletList":
        editor.chain().focus().toggleBulletList().run()
        break
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run()
        break
      default:
        break
    }
  }

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsTimerRunning(!isTimerRunning)
  }

  const handleFinalizeTimer = async () => {
    setIsTimerPanelOpen(true)
  }

  const handleAddTimeEntry = async () => {
    // Placeholder
    console.log("Adding time entry:", { timerInput, dateInput, commentInput })
    setIsTimerPanelOpen(false)
  }

  const handleCancelTimer = () => {
    setIsTimerPanelOpen(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run()
  }

  if (!editor) return null

  const hasText = editor.getHTML().trim() !== "" && editor.getHTML() !== "<p></p>"

  return (
    <div
      className="relative bg-white border-t border-gray-200"
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Reply/Edit banners */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="p-2 bg-gray-100 border-b border-gray-200">
              <ReplyPreview message={replyingTo} onClose={clearActions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-2 bg-yellow-100 text-yellow-800 flex justify-between items-center"
          >
            <span>✏️ Editing message...</span>
            <button onClick={clearActions} className="font-bold text-xs hover:underline">
              CANCEL
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer panel */}
      <TimerPanel
        isOpen={isTimerPanelOpen}
        timerInput={timerInput}
        setTimerInput={setTimerInput}
        dateInput={dateInput}
        setDateInput={setDateInput}
        commentInput={commentInput}
        setCommentInput={setCommentInput}
        totalHours={Math.floor(timerSeconds / 3600)}
        onAddTimeEntry={handleAddTimeEntry}
        onCancel={handleCancelTimer}
        isTimerRunning={isTimerRunning}
        timerSeconds={timerSeconds}
      />

      {/* Main form */}
      <form onSubmit={handleSend} className="flex flex-col">
        {/* Toolbar */}
        <AnimatePresence>
          {hasText && !isTimerMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-1 p-2 border-b border-gray-200 overflow-x-auto"
            >
              <motion.button
                type="button"
                onClick={() => handleToggleFormat("bold")}
                data-active={editor.isActive("bold")}
                className="p-2 rounded-md hover:bg-gray-100 data-[active=true]:bg-gray-200 transition-colors"
              >
                <Image src="/bold.svg" alt="Bold" width={16} height={16} />
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleToggleFormat("italic")}
                data-active={editor.isActive("italic")}
                className="p-2 rounded-md hover:bg-gray-100 data-[active=true]:bg-gray-200 transition-colors"
              >
                <Image src="/italic.svg" alt="Italic" width={16} height={16} />
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleToggleFormat("underline")}
                data-active={editor.isActive("underline")}
                className="p-2 rounded-md hover:bg-gray-100 data-[active=true]:bg-gray-200 transition-colors"
              >
                <Image src="/underline.svg" alt="Underline" width={16} height={16} />
              </motion.button>

              <div className="w-px h-6 bg-gray-200" />

              <motion.button
                type="button"
                onClick={() => handleToggleFormat("bulletList")}
                data-active={editor.isActive("bulletList")}
                className="p-2 rounded-md hover:bg-gray-100 data-[active=true]:bg-gray-200 transition-colors"
              >
                <Image src="/list.svg" alt="Bullet List" width={16} height={16} />
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleToggleFormat("orderedList")}
                data-active={editor.isActive("orderedList")}
                className="p-2 rounded-md hover:bg-gray-100 data-[active=true]:bg-gray-200 transition-colors"
              >
                <Image src="/list-ordered.svg" alt="Ordered List" width={16} height={16} />
              </motion.button>

              {hasReformulated && (
                <motion.button
                  type="button"
                  onClick={handleUndoReformulation}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors ml-auto"
                  title="Undo reformulation"
                >
                  <Image src="/rotate-ccw.svg" alt="Undo" width={16} height={16} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* File preview */}
        <AnimatePresence>
          {(previewUrl || file) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative m-2 p-2 flex items-center gap-2 bg-gray-100 rounded-lg"
            >
              {previewUrl ? (
                <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="h-12 w-12 object-cover rounded" />
              ) : (
                <Image src="/file.svg" alt="File" width={24} height={24} />
              )}
              <span className="text-sm text-gray-700 flex-1">{file?.name}</span>
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white cursor-pointer hover:bg-black/70"
              >
                <Image src="/x.svg" alt="Remove" width={14} height={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor */}
        <div ref={editorContainerRef} className="flex-1">
          <EditorContent
            editor={editor}
            className="ProseMirror min-h-[40px] max-h-[200px] overflow-y-auto p-3 outline-none text-sm"
          />
        </div>

        {/* Actions bar */}
        <div className="flex justify-between items-center p-2 border-t border-gray-200">
          {/* Left: Timer */}
          <TimerDisplay
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning}
            onToggleTimer={handleToggleTimer}
            onFinalizeTimer={handleFinalizeTimer}
            isRestoringTimer={isRestoringTimer}
            isInitializing={isInitializing}
            isMenuOpen={isTimerMenuOpen}
            setIsMenuOpen={setIsTimerMenuOpen}
          />

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* AI Dropup */}
            <div className="relative">
              <motion.button
                type="button"
                onClick={() => setIsDropupOpen(!isDropupOpen)}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Image src="/OpenAI.svg" alt="AI" width={20} height={20} />
              </motion.button>

              <AnimatePresence>
                {isDropupOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute bottom-full mb-2 right-0 w-48 bg-white shadow-lg rounded-md border border-gray-200 p-1 z-10"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleReformulate()
                        setIsDropupOpen(false)
                      }}
                      className="block w-full text-left p-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
                    >
                      Reformulate message
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left p-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
                    >
                      Check grammar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attach button */}
            <button
              type="button"
              onClick={handleThumbnailClick}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Image src="/paperclip.svg" alt="Attach" width={20} height={20} />
            </button>

            {/* Emoji selector */}
            <EmojiSelector onEmojiSelect={handleEmojiSelect} disabled={false} />

            {/* Send button */}
            <button
              type="submit"
              disabled={(!hasText && !file) || isProcessing}
              className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              <Image src="/arrow-up.svg" alt="Send" width={20} height={20} />
            </button>
          </div>
        </div>
      </form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  )
}
