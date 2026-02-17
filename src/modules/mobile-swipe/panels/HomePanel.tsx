'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { MessageList } from '@/modules/n8n-chatbot/components/chat/MessageList'
import { InputArea } from '@/modules/n8n-chatbot/components/chat/InputArea'
import { useChat } from '@/modules/n8n-chatbot/hooks/useChat'
import { DEFAULT_TRANSLATIONS } from '@/modules/n8n-chatbot/constants'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/modules/dialogs'
import {
  useMobilePanel,
  EXIT_DURATION,
  ENTER_DURATION,
} from '../hooks/useMobilePanel'
import { useSpotlightSearch } from '../hooks/useSpotlightSearch'
import { useKeyboardFloat } from '../hooks/useKeyboardFloat'
import { PredictionsDropdown } from '../components/PredictionsDropdown'
import { SmartInput } from '../components/SmartInput'
import styles from './HomePanel.module.scss'

const BOT_AVATAR = 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/android-chrome-192x192.png'

export function HomePanel() {
  const { isAdmin } = useAuth()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // GSAP refs for input area reveal
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    inputValue,
    setInputValue,
    selectedFile,
    isTyping,
    isOnline,
    webSearchEnabled,
    audioModeEnabled,
    documentModeEnabled,
    messagesEndRef,
    validateAndSetFile,
    clearFile,
    sendMessage,
    toggleWebSearch,
    toggleAudioMode,
    toggleDocumentMode,
    clearConversation,
  } = useChat({
    translations: DEFAULT_TRANSLATIONS,
    onRefreshNeeded: () => window.location.reload(),
  })

  // Filter out the welcome message — we show our own empty state
  const visibleMessages = useMemo(
    () => messages.filter((m, i) => !(i === 0 && m.sender === 'bot' && messages.length >= 1)),
    [messages],
  )

  // Has real conversation = more than just the welcome message
  const hasConversation = messages.length > 1

  // Keyboard float — input rises above virtual keyboard like native app
  const { keyboardOpen, keyboardHeight } = useKeyboardFloat()

  // Predictions only in empty state (no active AI conversation) — admin only
  const { results, hasResults } = useSpotlightSearch(searchQuery)
  const showPredictions = !hasConversation && searchQuery.length >= 2 && hasResults

  // ---- GSAP enter/exit on panel change for logo + input ----
  const activePanel = useMobilePanel((s) => s.activePanel)
  const transitionPhase = useMobilePanel((s) => s.transitionPhase)
  const hasInitRef = useRef(false)

  useEffect(() => {
    const logo = logoRef.current
    const input = inputAreaRef.current
    const targets = [logo, input].filter(Boolean)
    if (targets.length === 0) return

    const isHome = activePanel === 'home'

    // First mount
    if (!hasInitRef.current) {
      hasInitRef.current = true
      if (isHome) {
        gsap.set(targets, { autoAlpha: 0, y: 30, scale: 0.96 })
        gsap.to(targets, {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.55, stagger: 0.12, ease: 'power3.out', delay: 0.1,
        })
      } else {
        gsap.set(targets, { autoAlpha: 0, y: 30, scale: 0.96 })
      }
      return
    }

    // Phase: exiting — leaving home
    if (transitionPhase === 'exiting' && !isHome) {
      gsap.killTweensOf(targets)
      gsap.to(targets, {
        autoAlpha: 0, y: 20, scale: 0.96,
        duration: EXIT_DURATION / 1000, stagger: 0.04, ease: 'power2.in',
      })
    }

    // Phase: entering — arriving at home
    if (transitionPhase === 'entering' && isHome) {
      gsap.killTweensOf(targets)
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 25, scale: 0.96 },
        {
          autoAlpha: 1, y: 0, scale: 1,
          duration: ENTER_DURATION / 1000, stagger: 0.1, ease: 'power3.out',
        },
      )
    }
  }, [transitionPhase, activePanel])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value.trim())
    }, 200)
  }, [setInputValue])

  const handlePredictionTap = useCallback((item: { onTap: () => void }) => {
    item.onTap()
    setInputValue('')
    setSearchQuery('')
  }, [setInputValue])

  const handleSend = useCallback(() => {
    setSearchQuery('')
    sendMessage()
  }, [sendMessage])

  const handleExitChat = useCallback(() => {
    setShowExitConfirm(true)
  }, [])

  const handleConfirmExit = useCallback(() => {
    clearConversation()
    setShowExitConfirm(false)
    setSearchQuery('')
  }, [clearConversation])

  return (
    <div className={styles.panel}>
      {isAdmin ? (
        /* ───── Admin: AI Chat + Predictions ───── */
        <div className={styles.chatArea}>
          {!hasConversation && (
            <div className={styles.emptyState}>
              <div ref={logoRef} className={styles.logoShimmer} />
            </div>
          )}

          {hasConversation && (
            <div className={styles.messageArea}>
              <MessageList
                ref={messagesEndRef}
                messages={visibleMessages}
                isTyping={isTyping}
                avatarUrl={BOT_AVATAR}
              />
            </div>
          )}

          <div
            ref={inputAreaRef}
            className={`${styles.inputArea} ${keyboardOpen ? styles.inputAreaFloating : ''}`}
            style={keyboardOpen ? { bottom: keyboardHeight } : undefined}
          >
            {!hasConversation && !keyboardOpen && (
              <div className={styles.predictionsAnchor}>
                <PredictionsDropdown
                  results={results}
                  visible={showPredictions}
                  onItemTap={handlePredictionTap}
                />
              </div>
            )}

            <AnimatePresence>
              {hasConversation && (
                <motion.button
                  className={styles.exitButton}
                  onClick={handleExitChat}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  <X size={12} />
                  <span>Salir del chat</span>
                </motion.button>
              )}
            </AnimatePresence>

            <InputArea
              value={inputValue}
              onChange={handleInputChange}
              onSend={handleSend}
              onFileSelect={validateAndSetFile}
              selectedFile={selectedFile}
              onClearFile={clearFile}
              webSearchEnabled={webSearchEnabled}
              audioModeEnabled={audioModeEnabled}
              documentModeEnabled={documentModeEnabled}
              onToggleWebSearch={toggleWebSearch}
              onToggleAudioMode={toggleAudioMode}
              onToggleDocumentMode={toggleDocumentMode}
              translations={DEFAULT_TRANSLATIONS}
              disabled={!isOnline}
              isLoading={isTyping}
            />
          </div>

          <ResponsiveDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
            <ResponsiveDialogContent size="sm">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Salir del chat</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  La conversación se perderá y no podrá recuperarse.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <ResponsiveDialogFooter>
                <button
                  className={styles.confirmCancel}
                  onClick={() => setShowExitConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.confirmExit}
                  onClick={handleConfirmExit}
                >
                  Descartar chat
                </button>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      ) : (
        /* ───── Non-admin: Search only (no AI) ───── */
        <div className={styles.chatArea}>
          <div className={styles.emptyState}>
            <div ref={logoRef} className={styles.logoShimmer} />
          </div>

          <div
            ref={inputAreaRef}
            className={`${styles.inputArea} ${styles.inputAreaNonAdmin} ${keyboardOpen ? styles.inputAreaFloating : ''}`}
            style={keyboardOpen ? { bottom: keyboardHeight } : undefined}
          >
            <SmartInput />
          </div>
        </div>
      )}
    </div>
  )
}
