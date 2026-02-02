/**
 * InputChat Module - Modern Input Chat Organism
 *
 * Completely rewritten based on n8n-chatbot InputArea for cleaner, modern UI
 * Features: Audio recording, Web search, File uploads, Modern animations
 *
 * @module chat/components/organisms/InputChat
 */

'use client'

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { ArrowUp, Paperclip, Mic, X, Square, StopCircle, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudioRecorder } from '@/modules/chat/hooks/useAudioRecorder'
import { toast } from '@/components/ui/use-toast'
import styles from '@/modules/n8n-chatbot/styles/components/input-area.module.scss'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const DRAFT_STORAGE_KEY_PREFIX = 'chat_draft_'

interface Message {
  id: string
  senderId: string
  senderName: string
  text: string | null
  timestamp?: any
  read: boolean
  hours?: number
  imageUrl?: string | null
  fileUrl?: string | null
  fileName?: string | null
  fileType?: string | null
  filePath?: string | null
  isPending?: boolean
  hasError?: boolean
  clientId: string
  replyTo?: {
    id: string
    senderName: string
    text: string | null
    imageUrl?: string | null
  } | null
}

export interface InputChatProps {
  // Task and user info
  taskId: string
  userId: string
  userName: string
  userFirstName?: string

  // Message handlers
  onSendMessage: (message: Partial<Message>) => Promise<void>
  onEditMessage?: (messageId: string, newText: string) => Promise<void>

  // Reply/Edit state (deprecated - not used in this version)
  replyingTo?: Message | null
  onCancelReply?: () => void
  editingMessageId?: string | null
  editingText?: string
  onCancelEdit?: () => void

  // State
  isSending?: boolean
  setIsSending?: React.Dispatch<React.SetStateAction<boolean>>
  disabled?: boolean

  // Feature flags
  showWebSearch?: boolean // Show web search toggle (default: false, only for AI assistant)

  // Users for mentions (deprecated - not used in this version)
  users?: { id: string; fullName: string }[]

  // Timer (deprecated - not used in this version)
  onOpenManualEntry?: () => void
}

const CustomDivider: React.FC = () => (
  <div className={styles.divider} />
)

/**
 * InputChat - Modern, clean input component based on n8n-chatbot
 *
 * Features:
 * - Simple textarea (no rich text editor)
 * - Audio recording with visual feedback
 * - Web search toggle
 * - File upload with drag-and-drop
 * - Modern animations
 *
 * Removed features (from old version):
 * - Rich text editor (TipTap)
 * - Reply/Edit modes
 * - Mention autocomplete
 * - Formatting toolbar
 * - Timer integration
 */
export const InputChat: React.FC<InputChatProps> = ({
  taskId,
  userId,
  userName,
  userFirstName = 'Usuario',
  onSendMessage,
  isSending: isSendingProp = false,
  setIsSending: setIsSendingProp,
  disabled = false,
  showWebSearch = false,
}) => {
  // ========== STORAGE KEY ==========
  const storageKey = useMemo(() => `${DRAFT_STORAGE_KEY_PREFIX}${taskId}`, [taskId])

  // ========== STATE ==========
  const [value, setValue] = useState(() => {
    // Inicializar con valor de sessionStorage si existe
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(`${DRAFT_STORAGE_KEY_PREFIX}${taskId}`) || ''
      } catch {
        return ''
      }
    }
    return ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [audioModeEnabled, setAudioModeEnabled] = useState(false)

  // Local state for sending if not controlled
  const [localSending, setLocalSending] = useState(false)
  const isSending = setIsSendingProp ? isSendingProp : localSending
  const setIsSending = setIsSendingProp || setLocalSending

  // ========== REFS ==========
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ========== STABLE CALLBACKS FOR AUDIO RECORDER ==========
  // These MUST be stable (useCallback) to prevent the useEffect in useAudioRecorder
  // from re-triggering startRecording multiple times due to callback reference changes.
  // ChatSidebar has many re-render sources (Zustand stores, animations, etc.) that would
  // otherwise cause these inline callbacks to change on every render.
  const handleAudioTranscription = useCallback((text: string) => {
    setValue(prev => prev ? `${prev} ${text}` : text)
  }, [])

  const handleAudioError = useCallback((error: string) => {
    toast({
      title: 'Error de audio',
      description: error,
      variant: 'error',
    })
  }, [])

  // ========== AUDIO RECORDING HOOK ==========
  const {
    isRecording,
    isProcessing: isTranscribing,
    startRecording,
    stopRecording,
    audioTime
  } = useAudioRecorder({
    onTranscription: handleAudioTranscription,
    onError: handleAudioError,
  })

  // ========== PERSIST DRAFT TO SESSION STORAGE ==========
  useEffect(() => {
    try {
      if (value.trim()) {
        sessionStorage.setItem(storageKey, value)
      } else {
        sessionStorage.removeItem(storageKey)
      }
    } catch {
      // sessionStorage not available (SSR or private browsing)
    }
  }, [value, storageKey])

  // ========== AUTO-RESIZE TEXTAREA ==========
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`
    }
  }, [value])

  // ========== FILE PREVIEW ==========
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }, [selectedFile])

  // ========== SYNC AUDIO RECORDING ==========
  useEffect(() => {
    if (audioModeEnabled && !isRecording) {
      startRecording()
    } else if (!audioModeEnabled && isRecording) {
      stopRecording()
    }
  }, [audioModeEnabled, isRecording, startRecording, stopRecording])

  // ========== HELPERS ==========
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getPlaceholder = () => {
    if (isTranscribing) return 'Transcribiendo audio...'
    if (webSearchEnabled) return 'Buscar en la web...'
    if (audioModeEnabled && isRecording) return 'Grabando... (presiona de nuevo para detener)'
    return 'Escribir mensaje...'
  }

  // ========== HANDLERS ==========
  const handleToggleChange = (toggleType: 'search' | 'audio') => {
    if (toggleType === 'search') {
      setWebSearchEnabled(prev => !prev)
    } else if (toggleType === 'audio') {
      setAudioModeEnabled(prev => !prev)
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [value, selectedFile],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
      e.target.value = ''
    },
    [],
  )

  const handleFileSelect = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Archivo demasiado grande',
        description: 'El archivo supera los 10 MB.',
        variant: 'error',
      })
      return false
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt']
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast({
        title: 'Extensión no permitida',
        description: `Extensión no permitida. Permitidas: ${validExtensions.join(', ')}`,
        variant: 'error',
      })
      return false
    }

    setSelectedFile(file)
    return true
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const handleClearFile = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
  }, [])

  const handleSend = useCallback(async () => {
    const hasText = value.trim() !== ''
    const hasFile = selectedFile !== null

    if (!userId || (!hasText && !hasFile) || isSending || isTranscribing) return

    setIsSending(true)
    const clientId = crypto.randomUUID()

    try {
      let finalMessageData: Partial<Message> = {
        senderId: userId,
        senderName: userFirstName || 'Usuario',
        text: hasText ? value : null,
        read: false,
        imageUrl: null,
        fileUrl: null,
        fileName: selectedFile ? selectedFile.name : null,
        fileType: selectedFile ? selectedFile.type : null,
        filePath: null,
        isPending: false,
        hasError: false,
        clientId,
      }

      // Upload file if present
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('userId', userId)
        formData.append('type', 'attachment')
        formData.append('conversationId', taskId)

        const response = await fetch('/api/upload-blob', {
          method: 'POST',
          body: formData,
          headers: { 'x-clerk-user-id': userId },
        })

        if (!response.ok) throw new Error('Failed to upload file')

        // La respuesta viene envuelta en { success: true, data: { url, ... } }
        const result = await response.json()
        const uploadData = result.data || result
        const { url, fileName, fileType, pathname } = uploadData

        finalMessageData = {
          ...finalMessageData,
          imageUrl: selectedFile.type.startsWith('image/') ? url : null,
          fileUrl: url && !selectedFile.type.startsWith('image/') ? url : null,
          fileName,
          fileType,
          filePath: pathname, // Vercel Blob usa 'pathname' en lugar de 'filePath'
        }
      }

      // Add web search metadata if enabled
      if (webSearchEnabled) {
        finalMessageData.text = `[WEB SEARCH] ${finalMessageData.text || ''}`
      }

      // Send message
      await onSendMessage(finalMessageData)

      // Clear input on success
      setValue('')
      setSelectedFile(null)
      setFilePreview(null)
      setWebSearchEnabled(false)

    } catch (error) {
      toast({
        title: 'Error al enviar',
        description: 'Error al enviar el mensaje. Intenta de nuevo.',
        variant: 'error',
      })
    } finally {
      setIsSending(false)
    }
  }, [value, selectedFile, userId, userFirstName, taskId, isSending, isTranscribing, webSearchEnabled, onSendMessage, setIsSending])

  const hasContent = value.trim() !== '' || selectedFile !== null

  // ========== RENDER ==========
  return (
    <div className={styles.inputContainer}>
      <div
        className={`${styles.inputWrapper} ${isRecording ? styles.isRecording : ''} ${isDragging ? styles.isDragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File preview */}
        <AnimatePresence>
          {selectedFile && !isRecording && (
            <motion.div
              className={styles.filePreview}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.fileItem}>
                {selectedFile.type.startsWith('image/') && filePreview ? (
                  <div className={styles.imagePreview}>
                    <img src={filePreview} alt={selectedFile.name} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClearFile()
                      }}
                      className={styles.removeImageBtn}
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{selectedFile.name}</span>
                    <button onClick={handleClearFile} className={styles.removeFileBtn}>
                      <X className="h-3 w-3 text-neutral-400" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea - hidden when recording */}
        <div className={`${styles.textareaContainer} ${isRecording ? styles.hidden : ''}`}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled || isRecording}
            rows={1}
          />
        </div>

        {/* Recording UI - shown when recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={styles.recordingUI}
            >
              <div className={styles.recordingContent}>
                <div className={styles.recordingIndicator}>
                  <motion.div
                    className={styles.recordingDot}
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className={styles.recordingText}>Grabando...</span>
                </div>

                {/* Frequency Animation */}
                <div className={styles.frequencyBars}>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={styles.bar}
                      initial={{ height: 2 }}
                      animate={{
                        height: [2, 3 + Math.random() * 10, 3 + Math.random() * 5, 2],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.05,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>

                {/* Timer */}
                <div className={styles.recordingTimer}>{formatTime(audioTime)}</div>

                {/* Stop button */}
                <button
                  onClick={() => handleToggleChange('audio')}
                  className={styles.stopRecordingBtn}
                  title="Detener grabación"
                >
                  <StopCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action bar */}
        <div className={styles.actionBar}>
          {/* Left side actions - hidden when recording */}
          <div className={`${styles.leftActions} ${isRecording ? styles.hidden : ''}`}>
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.attachBtn}
              disabled={isRecording}
            >
              <Paperclip className="h-5 w-5 transition-colors" />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf,.txt,.doc,.docx"
              />
            </button>

            {/* Toggle buttons group */}
            <div className={styles.toggleGroup}>
              {/* Search toggle - only shown for AI assistant */}
              {showWebSearch && (
                <>
                  <button
                    type="button"
                    onClick={() => handleToggleChange('search')}
                    className={`${styles.toggleBtn} ${webSearchEnabled ? styles.active : ''}`}
                  >
                    <div className={styles.iconContainer}>
                      <motion.div
                        animate={{ rotate: webSearchEnabled ? 360 : 0, scale: webSearchEnabled ? 1.1 : 1 }}
                        whileHover={{
                          rotate: webSearchEnabled ? 360 : 15,
                          scale: 1.1,
                          transition: { type: 'spring', stiffness: 300, damping: 10 },
                        }}
                        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                      >
                        <Globe className="w-4 h-4" />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {webSearchEnabled && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={styles.label}
                        >
                          Buscar
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>

                  <CustomDivider />
                </>
              )}

              {/* Audio toggle */}
              <motion.button
                type="button"
                onClick={() => handleToggleChange('audio')}
                className={`${styles.toggleBtn} ${styles.audio} ${audioModeEnabled ? styles.active : ''}`}
                layout
                transition={{ layout: { duration: 0.4 } }}
              >
                <div className={styles.iconContainer}>
                  {audioModeEnabled ? (
                    <motion.div
                      className="w-3.5 h-3.5 bg-[#8B5CF6] rounded-sm"
                      animate={{ rotate: [0, 180, 360] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ) : (
                    <motion.div
                      whileHover={{
                        rotate: 15,
                        scale: 1.1,
                        transition: { type: 'spring', stiffness: 300, damping: 10 },
                      }}
                    >
                      <Mic className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  {audioModeEnabled && (
                    <motion.div
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: 'auto', marginLeft: 4 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{ overflow: 'hidden', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {/* Frequency Animation */}
                      <div className={styles.frequencyBars}>
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            className={styles.bar}
                            initial={{ height: 2 }}
                            animate={{
                              height: audioModeEnabled ? [2, 3 + Math.random() * 10, 3 + Math.random() * 5, 2] : 2,
                            }}
                            transition={{
                              duration: audioModeEnabled ? 1 : 0.3,
                              repeat: audioModeEnabled ? Infinity : 0,
                              delay: audioModeEnabled ? i * 0.05 : 0,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                      {/* Timer */}
                      <div className={styles.timer}>{formatTime(audioTime)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Right side - Send button */}
          <button
            className={`${styles.sendBtn} ${hasContent ? styles.hasContent : styles.empty}`}
            onClick={() => {
              if (hasContent) handleSend()
            }}
            disabled={(isSending && !hasContent) || isTranscribing}
          >
            {isSending || isTranscribing ? (
              <Square className="h-4 w-4 fill-[#1F2023] animate-pulse" />
            ) : hasContent ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowUp className="h-4 w-4 opacity-40" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

InputChat.displayName = 'InputChat'
