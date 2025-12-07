'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { ArrowUp, Paperclip, Mic, X, Square, StopCircle, Globe, FolderCog as FolderCode } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatbotTranslations } from '../../types'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import styles from '../../styles/components/input-area.module.scss'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onFileSelect: (file: File) => boolean
  selectedFile: File | null
  onClearFile: () => void
  webSearchEnabled: boolean
  audioModeEnabled: boolean
  canvasModeEnabled: boolean
  onToggleWebSearch: () => void
  onToggleAudioMode: () => void
  onToggleCanvasMode: () => void
  translations: ChatbotTranslations
  disabled?: boolean
  isLoading?: boolean
}

const CustomDivider: React.FC = () => (
  <div className={styles.divider} />
)

export function InputArea({
  value,
  onChange,
  onSend,
  onFileSelect,
  selectedFile,
  onClearFile,
  webSearchEnabled,
  audioModeEnabled,
  canvasModeEnabled,
  onToggleWebSearch,
  onToggleAudioMode,
  onToggleCanvasMode,
  translations,
  disabled = false,
  isLoading = false,
}: InputAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Audio recording hook
  const {
    isRecording,
    isProcessing: isTranscribing,
    startRecording,
    stopRecording,
    audioTime
  } = useAudioRecorder({
    onTranscription: (text) => {
      // Insertar transcripción en el input
      onChange(value ? `${value} ${text}` : text)
    },
    onError: (error) => {
      console.error('Audio transcription error:', error)
      alert('Error al transcribir audio. Intenta de nuevo.')
    }
  })

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`
    }
  }, [value])

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

  const handleToggleChange = (toggleType: 'search' | 'audio' | 'canvas') => {
    if (toggleType === 'search') {
      onToggleWebSearch()
    } else if (toggleType === 'audio') {
      onToggleAudioMode()
    } else if (toggleType === 'canvas') {
      onToggleCanvasMode()
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    },
    [onSend],
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

  const hasContent = value.trim() !== '' || selectedFile !== null

  const getPlaceholder = () => {
    if (isTranscribing) return 'Transcribiendo audio...'
    if (webSearchEnabled) return 'Buscar en la web...'
    if (audioModeEnabled && isRecording) return 'Grabando... (presiona de nuevo para detener)'
    if (canvasModeEnabled) return 'Crear un plan...'
    return translations.placeholder
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
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{selectedFile.name}</span>
                    <button onClick={onClearFile} className={styles.removeFileBtn}>
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
            onChange={(e) => onChange(e.target.value)}
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
                  onClick={() => onToggleAudioMode()}
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
            <button onClick={() => fileInputRef.current?.click()} className={styles.attachBtn} disabled={isRecording}>
              <Paperclip className="h-5 w-5 transition-colors" />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf,.txt,audio/*"
              />
            </button>

            {/* Toggle buttons group */}
            <div className={styles.toggleGroup}>
              {/* Search toggle */}
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

              <CustomDivider />

              {/* Canvas toggle */}
              <button
                type="button"
                onClick={() => handleToggleChange('canvas')}
                className={`${styles.toggleBtn} ${styles.canvas} ${canvasModeEnabled ? styles.active : ''}`}
              >
                <div className={styles.iconContainer}>
                  <motion.div
                    animate={{ rotate: canvasModeEnabled ? 360 : 0, scale: canvasModeEnabled ? 1.1 : 1 }}
                    whileHover={{
                      rotate: canvasModeEnabled ? 360 : 15,
                      scale: 1.1,
                      transition: { type: 'spring', stiffness: 300, damping: 10 },
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                  >
                    <FolderCode className="w-4 h-4" />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {canvasModeEnabled && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={styles.label}
                    >
                      Crear Plan
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* Right side - Send button */}
          <button
            className={`${styles.sendBtn} ${hasContent ? styles.hasContent : styles.empty}`}
            onClick={() => {
              if (hasContent) onSend()
            }}
            disabled={(isLoading && !hasContent) || isTranscribing}
          >
            {isLoading || isTranscribing ? (
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
