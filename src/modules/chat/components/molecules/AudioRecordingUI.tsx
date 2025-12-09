/**
 * Audio Recording UI - Shared Component
 * 
 * UI para mostrar el estado de grabación de audio
 * Reutiliza estilos del n8n-chatbot
 * 
 * @module chat/components/molecules/AudioRecordingUI
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StopCircle } from 'lucide-react'
import styles from '@/modules/n8n-chatbot/styles/components/input-area.module.scss'

interface AudioRecordingUIProps {
  isRecording: boolean
  audioTime: number
  onStop: () => void
}

export const AudioRecordingUI: React.FC<AudioRecordingUIProps> = ({
  isRecording,
  audioTime,
  onStop,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
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
              onClick={onStop}
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
  )
}

AudioRecordingUI.displayName = 'AudioRecordingUI'
