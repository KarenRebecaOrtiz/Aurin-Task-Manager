/**
 * SharedPlanInput - Simple Input Component
 * 
 * Basado en InputArea del n8n-chatbot pero ULTRA SIMPLIFICADO:
 * - Solo textarea + send button
 * - SIN file uploads
 * - SIN audio
 * - SIN toggles
 * - SIN drag & drop
 */

'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import type { PlanComment } from '../../types'
import styles from '../../styles/SharedPlanInput.module.scss'

interface SharedPlanInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
}

export function SharedPlanInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Escribe un comentario...',
}: SharedPlanInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`
    }
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() !== '' && !disabled && !isLoading) {
          onSend()
        }
      }
    },
    [value, onSend, disabled, isLoading],
  )

  const hasContent = value.trim() !== ''

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        {/* Textarea */}
        <div className={styles.textareaContainer}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
          />
        </div>

        {/* Action bar */}
        <div className={styles.actionBar}>
          <div /> {/* Spacer */}
          
          {/* Send button */}
          <button
            className={`${styles.sendBtn} ${hasContent ? styles.hasContent : styles.empty}`}
            onClick={() => {
              if (hasContent && !disabled && !isLoading) onSend()
            }}
            disabled={disabled || isLoading || !hasContent}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
