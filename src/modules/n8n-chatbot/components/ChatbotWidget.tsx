'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatbotWidgetProps } from '../types'
import { DEFAULT_TRANSLATIONS } from '../constants'
import { useChatbotControl } from '../hooks/useChatbotControl'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogClose,
} from '@/modules/dialogs'
import { useChat } from '../hooks/useChat'
import { ChatHeader } from './chat/ChatHeader'
import { MessageList } from './chat/MessageList'
import { InputArea } from './chat/InputArea'
import { floatingButtonVariants, badgeVariants, containerVariants } from '../lib/animations'
import styles from '../styles/components/chatbot-widget.module.scss'

export default function ChatbotWidget({
  lang = 'es',
  translations,
  controlled = false,
}: ChatbotWidgetProps & { controlled?: boolean }) {
  const t = translations || DEFAULT_TRANSLATIONS
  const { isOpen: isOpenControlled, closeChat } = useChatbotControl()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const isOpen = controlled ? isOpenControlled : isExpanded
  const handleToggle = (open: boolean) => {
    if (controlled) {
      if (!open) closeChat()
    } else {
      setIsExpanded(open)
    }
  }

  const {
    messages,
    inputValue,
    setInputValue,
    selectedFile,
    isTyping,
    isOnline,
    webSearchEnabled,
    audioModeEnabled,
    canvasModeEnabled,
    messagesEndRef,
    validateAndSetFile,
    clearFile,
    sendMessage,
    toggleWebSearch,
    toggleAudioMode,
    toggleCanvasMode,
    scrollToBottom,
  } = useChat({
    translations: t,
    onRefreshNeeded: () => window.location.reload(),
  })

  // Check mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Handle click outside for desktop mode
  useEffect(() => {
    if (!isExpanded || controlled) return

    const handleClickOutside = (event: MouseEvent) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    const preventBodyScroll = () => {
      document.body.style.overflow = 'hidden'
    }

    const restoreBodyScroll = () => {
      document.body.style.overflow = ''
    }

    preventBodyScroll()
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      restoreBodyScroll()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded, controlled])

  // Auto-scroll when chat is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom('instant'), 100)
    }
  }, [isOpen, scrollToBottom])

  // Don't show floating button if controlled (mobile will use navigation button)
  if (!isOpen && controlled) return null

  // Floating button (closed state)
  if (!isOpen) {
    return (
      <motion.button
        onClick={() => handleToggle(true)}
        className={styles.floatingBtn}
        aria-label={t.openChat}
        variants={floatingButtonVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle size={32} />
        {messages.length > 1 && (
          <motion.span className={styles.badge} variants={badgeVariants} initial="hidden" animate="visible">
            {messages.filter((m) => m.sender === 'bot').length}
          </motion.span>
        )}
      </motion.button>
    )
  }

  const botAvatarUrl = 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/android-chrome-192x192.png'

  // If controlled, use ResponsiveDialog (auto-switches to Drawer on mobile)
  if (controlled) {
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={handleToggle}>
        <ResponsiveDialogContent className={styles.responsiveDialog}>
          <ResponsiveDialogHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={botAvatarUrl}
                  alt="Bot Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <ResponsiveDialogTitle className="m-0 text-white">{t.title}</ResponsiveDialogTitle>
            </div>
            <ResponsiveDialogClose />
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className={styles.responsiveBody}>
            <MessageList ref={messagesEndRef} messages={messages} isTyping={isTyping} avatarUrl={botAvatarUrl} />

            <InputArea
              value={inputValue}
              onChange={setInputValue}
              onSend={sendMessage}
              onFileSelect={validateAndSetFile}
              selectedFile={selectedFile}
              onClearFile={clearFile}
              webSearchEnabled={webSearchEnabled}
              audioModeEnabled={audioModeEnabled}
              canvasModeEnabled={canvasModeEnabled}
              onToggleWebSearch={toggleWebSearch}
              onToggleAudioMode={toggleAudioMode}
              onToggleCanvasMode={toggleCanvasMode}
              translations={t}
              disabled={!isOnline}
              isLoading={isTyping}
            />
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    )
  }

  // Desktop floating chat (non-controlled mode)
  return (
    <AnimatePresence>
      <motion.div
        ref={chatContainerRef}
        className={`${styles.desktopContainer} ${isMobile ? styles.mobile : ''}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <ChatHeader
          title={t.title}
          onMinimize={() => {
            setIsExpanded(false)
            document.body.style.overflow = ''
          }}
          minimizeLabel={t.minimizeChat}
          avatarUrl={botAvatarUrl}
          isMobile={isMobile}
        />

        <MessageList ref={messagesEndRef} messages={messages} isTyping={isTyping} avatarUrl={botAvatarUrl} />

        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          onFileSelect={validateAndSetFile}
          selectedFile={selectedFile}
          onClearFile={clearFile}
          webSearchEnabled={webSearchEnabled}
          audioModeEnabled={audioModeEnabled}
          canvasModeEnabled={canvasModeEnabled}
          onToggleWebSearch={toggleWebSearch}
          onToggleAudioMode={toggleAudioMode}
          onToggleCanvasMode={toggleCanvasMode}
          translations={t}
          disabled={!isOnline}
          isLoading={isTyping}
        />
      </motion.div>
    </AnimatePresence>
  )
}
