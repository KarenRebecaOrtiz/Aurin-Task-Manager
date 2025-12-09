/**
 * Input Toggle Buttons - Shared Component
 * 
 * Botón de toggle para audio (websearch removido para el módulo chat)
 * Reutiliza estilos del n8n-chatbot
 * 
 * @module chat/components/molecules/InputToggleButtons
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic } from 'lucide-react'
import styles from '@/modules/n8n-chatbot/styles/components/input-area.module.scss'

interface InputToggleButtonsProps {
  audioModeEnabled: boolean
  onToggleAudioMode: () => void
  audioTime?: number
  disabled?: boolean
}

export const InputToggleButtons: React.FC<InputToggleButtonsProps> = ({
  audioModeEnabled,
  onToggleAudioMode,
  audioTime = 0,
  disabled = false,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={styles.toggleGroup}>
      {/* Audio toggle */}
      <motion.button
        type="button"
        onClick={onToggleAudioMode}
        className={`${styles.toggleBtn} ${styles.audio} ${audioModeEnabled ? styles.active : ''}`}
        layout
        transition={{ layout: { duration: 0.4 } }}
        disabled={disabled}
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
                    key={`freq-bar-${i}`}
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
  )
}

InputToggleButtons.displayName = 'InputToggleButtons'
