/**
 * Chat Input Area - Adaptación del InputArea de n8n-chatbot para el módulo chat
 * 
 * Mantiene la MISMA estructura y estilos del n8n-chatbot pero adaptado para:
 * - TipTap editor en vez de textarea
 * - Sin web search (solo audio)
 * - Integración con el sistema de mensajes del chat
 * 
 * @module chat/components/organisms/ChatInputArea
 */

'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { ArrowUp, Paperclip, Mic, X, StopCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EditorContent, Editor } from '@tiptap/react'
import { useAudioRecorder } from '@/modules/chat/hooks/useAudioRecorder'
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery'
import { TimerDropdown } from '@/modules/chat/timer/components/molecules/TimerDropdown'
import { toast } from '@/components/ui/use-toast'
import styles from '@/modules/n8n-chatbot/styles/components/input-area.module.scss'

interface ChatInputAreaProps {
  taskId: string
  userId: string
  userName: string
  onSend: () => void
  onFileSelect: (file: File) => boolean
  selectedFile: File | null
  onClearFile: () => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
  // Editor externo (controlado desde InputChat)
  editor: Editor | null
  onEditorChange?: (html: string) => void
  // Mobile timer
  onOpenManualEntry?: () => void
}

export function ChatInputArea({
  taskId,
  userId,
  userName,
  onSend,
  onFileSelect,
  selectedFile,
  onClearFile,
  disabled = false,
  isLoading = false,
  placeholder = 'Escribe un mensaje...',
  editor,
  onEditorChange,
  onOpenManualEntry,
}: ChatInputAreaProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [isDragging, setIsDragging] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [audioModeEnabled, setAudioModeEnabled] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Audio recording hook
  const {
    isRecording,
    isProcessing: isTranscribing,
    startRecording,
    stopRecording,
    audioTime,
  } = useAudioRecorder({
    onTranscription: (text) => {
      // Insertar transcripción en el editor
      if (editor) {
        const currentText = editor.getText()
        editor.commands.setContent(currentText ? `${currentText} ${text}` : text)
        editor.commands.focus('end')
      }
    },
    onError: (error) => {
      toast({
        title: 'Error de audio',
        description: error,
        variant: 'error',
      })
    },
  })

  // Auto-resize editor
  const adjustEditorHeight = useCallback(() => {
    if (editorRef.current) {
      const editorElement = editorRef.current.querySelector('.ProseMirror') as HTMLElement
      if (editorElement) {
        editorElement.style.height = 'auto'
        const scrollHeight = editorElement.scrollHeight
        const maxHeight = 240
        const minHeight = 44
        editorElement.style.height = `${Math.max(Math.min(scrollHeight, maxHeight), minHeight)}px`
        editorElement.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
      }
    }
  }, [])

  // Watch editor changes for auto-resize
  useEffect(() => {
    if (editor) {
      adjustEditorHeight()
    }
  }, [editor, adjustEditorHeight])

  // File preview for images
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }, [selectedFile])

  // Sincronizar audio recording con el toggle del modo
  useEffect(() => {
    if (audioModeEnabled && !isRecording) {
      startRecording()
    } else if (!audioModeEnabled && isRecording) {
      stopRecording()
    }
  }, [audioModeEnabled, isRecording, startRecording, stopRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleAudioMode = useCallback(() => {
    setAudioModeEnabled(prev => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const hasContent = (editor && !editor.isEmpty) || selectedFile !== null
        if (hasContent && !disabled && !isLoading) onSend()
      }
    },
    [onSend, editor, selectedFile, disabled, isLoading],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
      e.target.value = ''
    },
    [onFileSelect],
  )

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
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const hasContent = (editor && !editor.isEmpty) || selectedFile !== null

  const getPlaceholder = () => {
    if (isTranscribing) return 'Transcribiendo audio...'
    if (audioModeEnabled && isRecording) return 'Grabando... (presiona de nuevo para detener)'
    return placeholder
  }

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
                        onClearFile()
                      }}
                      className={styles.removeImageBtn}
                      type="button"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{selectedFile.name}</span>
                    <button onClick={onClearFile} className={styles.removeFileBtn} type="button">
                      <X className="h-3 w-3 text-neutral-400" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor - hidden when recording */}
        <div className={`${styles.textareaContainer} ${isRecording ? styles.hidden : ''}`}>
          <div ref={editorRef}>
            <EditorContent
              editor={editor}
              onKeyDown={handleKeyDown}
            />
          </div>
          {/* Placeholder cuando está vacío */}
          {editor && editor.isEmpty && !isRecording && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                color: '#9ca3af',
                pointerEvents: 'none',
                fontSize: '16px',
              }}
            >
              {getPlaceholder()}
            </div>
          )}
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
                      key={`rec-bar-${i}`}
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
                  onClick={handleToggleAudioMode}
                  className={styles.stopRecordingBtn}
                  title="Detener grabación"
                  type="button"
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
              type="button"
            >
              <Paperclip className="h-5 w-5 transition-colors" />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf,.txt,.doc,.docx"
                style={{ display: 'none' }}
              />
            </button>

            {/* Toggle buttons group - solo audio */}
            <div className={styles.toggleGroup}>
              {/* Audio toggle */}
              <motion.button
                type="button"
                onClick={handleToggleAudioMode}
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
                            key={`toggle-bar-${i}`}
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
              if (hasContent) onSend()
            }}
            disabled={(isLoading && !hasContent) || isTranscribing}
            type="button"
          >
            {isLoading || isTranscribing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <ArrowUp className="h-4 w-4 opacity-40" />
              </motion.div>
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

ChatInputArea.displayName = 'ChatInputArea'
