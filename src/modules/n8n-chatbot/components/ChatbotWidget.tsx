'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, ChevronDown, Send, Paperclip, X, FileText, ImageIcon, Download, Bot } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { nanoid } from 'nanoid'
import type { Message, ChatbotWidgetProps } from '../types'
import { DEFAULT_TRANSLATIONS } from '../constants'
import {
  validateFile,
  formatFileSize,
  formatMessageTime,
  createSessionId,
  loadSession,
  updateSessionActivity,
  isOnline as checkOnline
} from '../utils'
import { MarkdownRenderer } from './MarkdownRenderer'
import styles from '../styles/chatbot.module.scss'

export default function ChatbotWidget({ lang = 'es', translations }: ChatbotWidgetProps) {
  const t = translations || DEFAULT_TRANSLATIONS

  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasInitialized = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Initialize session only once on mount
  useEffect(() => {
    if (hasInitialized.current) return

    // Try to load existing session
    const savedSession = loadSession()

    if (savedSession && savedSession.messages.length > 0) {
      setSessionId(savedSession.sessionId)
      setMessages(savedSession.messages)
    } else {
      // Create new session
      const newSessionId = createSessionId()
      setSessionId(newSessionId)

      // Create welcome message
      const welcomeMessage: Message = {
        id: nanoid(8),
        text: t.welcome,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        file: undefined
      }
      setMessages([welcomeMessage])
    }

    hasInitialized.current = true
  }, [])

  // Update welcome message when language changes
  useEffect(() => {
    if (!hasInitialized.current) return

    setMessages(prevMessages => {
      if (prevMessages.length === 0) return prevMessages

      return prevMessages.map((msg, index) => {
        if (index === 0 && msg.sender === 'bot' && msg.id.length === 8) {
          return { ...msg, text: t.welcome }
        }
        return msg
      })
    })
  }, [lang, t.welcome])

  // Handle event listeners and body scroll
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    const checkConnection = () => {
      setIsOnline(checkOnline())
    }

    const preventBodyScroll = () => {
      document.body.style.overflow = 'hidden'
    }

    const restoreBodyScroll = () => {
      document.body.style.overflow = ''
    }

    const closeChatbot = () => {
      setIsExpanded(false)
      restoreBodyScroll()
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target as Node)) {
        closeChatbot()
      }
    }

    checkMobile()
    checkConnection()

    window.addEventListener('resize', checkMobile)
    window.addEventListener('online', checkConnection)
    window.addEventListener('offline', checkConnection)

    if (isExpanded) {
      preventBodyScroll()
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('online', checkConnection)
      window.removeEventListener('offline', checkConnection)
      document.removeEventListener('mousedown', handleClickOutside)
      restoreBodyScroll()
    }
  }, [isExpanded])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return
    if (!isOnline) {
      alert(t.noConnection)
      return
    }

    const messageText = inputValue.trim()
    let fileUrl: string | undefined = undefined
    let fileMetadata: { name: string; size: string; type: string; url: string } | undefined = undefined

    // Upload file to Google Cloud Storage if present
    if (selectedFile) {
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('type', 'chatbot') // Tipo especial para chatbot

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to upload file')
        }

        const uploadData = await uploadResponse.json()
        fileUrl = uploadData.data?.url || uploadData.url

        if (fileUrl) {
          fileMetadata = {
            name: selectedFile.name,
            size: formatFileSize(selectedFile.size),
            type: selectedFile.type,
            url: fileUrl
          }
          console.log('✅ File uploaded to GCS:', fileUrl)
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        alert('Error al subir el archivo. Intenta de nuevo.')
        return
      }
    }

    // Create user message
    const userMessage: Message = {
      id: nanoid(8),
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
      file: fileMetadata
    }

    // Update state with new message
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Save to session if there are 2+ messages
    if (updatedMessages.length >= 2) {
      updateSessionActivity(sessionId, updatedMessages)
    }

    setInputValue("")
    setSelectedFile(null)
    setIsTyping(true)

    try {
      // Call n8n webhook
      const response = await fetch('/api/n8n-chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          sessionId: sessionId,
          fileUrl: fileUrl,
        })
      })

      setIsTyping(false)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage: Message = {
          id: nanoid(8),
          text: errorData.output || errorData.error || t.errorResponse,
          sender: "bot",
          timestamp: new Date().toISOString(),
          file: undefined
        }
        const updatedMessagesError = [...updatedMessages, errorMessage]
        setMessages(updatedMessagesError)
        updateSessionActivity(sessionId, updatedMessagesError)
        return
      }

      const data = await response.json()
      const botResponseText = data.output || data.response || t.errorProcess

      // Bot response
      const botMessage: Message = {
        id: nanoid(8),
        text: botResponseText,
        sender: "bot",
        timestamp: new Date().toISOString(),
        file: undefined
      }
      const updatedMessagesWithBot = [...updatedMessages, botMessage]
      setMessages(updatedMessagesWithBot)
      updateSessionActivity(sessionId, updatedMessagesWithBot)
    } catch (error) {
      console.error('Error:', error)
      setIsTyping(false)

      const errorMessage: Message = {
        id: nanoid(8),
        text: t.errorGeneric,
        sender: "bot",
        timestamp: new Date().toISOString(),
        file: undefined
      }
      const updatedMessagesWithError = [...updatedMessages, errorMessage]
      setMessages(updatedMessagesWithError)
      updateSessionActivity(sessionId, updatedMessagesWithError)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    const validation = validateFile(file)

    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  if (!isExpanded) {
    return (
      <motion.button
        onClick={() => setIsExpanded(true)}
        className={styles.chatbotFloatingBtn}
        aria-label={t.openChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <MessageCircle size={32} color="black" />
        {messages.length > 1 && (
          <motion.span
            className={styles.chatbotBadge}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            {messages.filter(m => m.sender === 'bot').length}
          </motion.span>
        )}
      </motion.button>
    )
  }

  return (
    <motion.div
      ref={chatContainerRef}
      className={`${styles.chatbotMain} ${isMobile ? styles.chatbotMainMobile : ''}`}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <motion.div
        className={`${styles.chatbotHeader} ${isMobile ? styles.chatbotHeaderMobile : ''}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.chatbotHeaderInfo}>
          <div className={styles.chatbotAvatar}>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Bot size={32} color="black" strokeWidth={2} />
            </motion.div>
          </div>
          <div>
            <h3 className={styles.chatbotTitle}>{t.title}</h3>
          </div>
        </div>
        <motion.button
          onClick={() => {
            setIsExpanded(false)
            document.body.style.overflow = ''
          }}
          className={styles.chatbotMinimizeBtn}
          aria-label={t.minimizeChat}
          whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronDown size={20} color="black" />
        </motion.button>
      </motion.div>

      {/* Messages Container */}
      <div
        className={`${styles.chatbotMessages} ${styles.chatbotScrollbar}`}
        onWheel={(e) => {
          const container = e.currentTarget
          const isScrollingUp = e.deltaY < 0
          const isScrollingDown = e.deltaY > 0
          const isAtTop = container.scrollTop === 0
          const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1

          if ((isScrollingUp && !isAtTop) || (isScrollingDown && !isAtBottom)) {
            e.stopPropagation()
          }
        }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`${styles.chatbotMessage} ${message.sender === "user" ? styles.chatbotMessageUser : styles.chatbotMessageBot}`}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {message.sender === "bot" && (
                <motion.div
                  className={styles.chatbotBotAvatar}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                >
                  <Bot size={20} color="black" strokeWidth={2} />
                </motion.div>
              )}
              <div className={`${styles.chatbotMessageContent} ${message.sender === "user" ? styles.chatbotMessageContentUser : styles.chatbotMessageContentBot}`}>
                <motion.div
                  className={`${styles.chatbotBubble} ${message.sender === "user" ? styles.chatbotBubbleUser : styles.chatbotBubbleBot}`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  {message.sender === 'bot' ? (
                    <MarkdownRenderer content={message.text} />
                  ) : (
                    message.text
                  )}
                  {message.file && (
                    <motion.div
                      className={styles.chatbotFileAttachment}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {message.file.type.startsWith("image/") ? (
                        <motion.img
                          src={message.file.url || "/placeholder.svg"}
                          alt={message.file.name}
                          whileHover={{ opacity: 0.9 }}
                          style={{ borderRadius: '8px', maxWidth: '100%', cursor: 'pointer' }}
                        />
                      ) : (
                        <div className={styles.chatbotFileAttachmentInfo}>
                          <FileText size={32} color="#d0df00" />
                          <div className={styles.chatbotFileAttachmentDetails}>
                            <p className={styles.chatbotFileAttachmentName}>{message.file.name}</p>
                            <p className={styles.chatbotFileAttachmentSize}>{message.file.size}</p>
                          </div>
                          <motion.button
                            className={styles.chatbotDownloadBtn}
                            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Download size={16} />
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                <span className={`${styles.chatbotTimestamp} ${message.sender === "user" ? styles.chatbotTimestampUser : ''}`}>
                  {formatMessageTime(message.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isTyping && (
            <motion.div
              className={`${styles.chatbotMessage} ${styles.chatbotMessageBot}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className={styles.chatbotBotAvatar}>
                <Bot size={20} color="black" strokeWidth={2} />
              </div>
              <div className={`${styles.chatbotBubble} ${styles.chatbotBubbleBot}`}>
                <div className={styles.chatbotTyping}>
                  <motion.div
                    className={styles.chatbotTypingDot}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className={styles.chatbotTypingDot}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className={styles.chatbotTypingDot}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div
        className={`${styles.chatbotInputArea} ${isMobile ? styles.chatbotInputAreaMobile : ''} ${isDragging ? styles.chatbotInputAreaDragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div
              className={styles.chatbotDragOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className={styles.chatbotDragContent}
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Paperclip size={48} color="#d0df00" />
                </motion.div>
                <p className={styles.chatbotDragText}>{t.dragFiles}</p>
                <p className={styles.chatbotDragSubtext}>{t.maxSize}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedFile && (
            <motion.div
              className={styles.chatbotFilePreview}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
              >
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon size={32} color="#d0df00" />
                ) : (
                  <FileText size={32} color="#d0df00" />
                )}
              </motion.div>
              <div className={styles.chatbotFilePreviewInfo}>
                <p className={styles.chatbotFilePreviewName}>{selectedFile.name}</p>
                <p className={styles.chatbotFilePreviewSize}>{formatFileSize(selectedFile.size)}</p>
              </div>
              <motion.button
                onClick={() => setSelectedFile(null)}
                className={styles.chatbotRemoveFileBtn}
                aria-label={t.removeFile}
                whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} color="#ef4444" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.chatbotInputContainer}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.txt"
          />
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className={styles.chatbotAttachBtn}
            aria-label={t.attach}
            whileHover={{
              backgroundColor: 'rgba(208, 223, 0, 0.1)',
              scale: 1.1
            }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Paperclip size={20} color="#6b7280" />
            </motion.div>
          </motion.button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t.placeholder}
            className={styles.chatbotTextarea}
            rows={1}
          />

          <motion.button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() && !selectedFile}
            className={`${styles.chatbotSendBtn} ${(!inputValue.trim() && !selectedFile) ? styles.chatbotSendBtnDisabled : ''}`}
            aria-label={t.send}
            whileHover={(!inputValue.trim() && !selectedFile) ? {} : {
              scale: 1.05,
              boxShadow: '0 4px 12px rgba(208, 223, 0, 0.4)'
            }}
            whileTap={(!inputValue.trim() && !selectedFile) ? {} : { scale: 0.95 }}
          >
            <Send size={20} color="black" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
