'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChatbotControl } from '@/modules/n8n-chatbot'
import { useMobilePanel } from '../hooks/useMobilePanel'
import { useSpotlightSearch } from '../hooks/useSpotlightSearch'
import { PredictionsDropdown } from './PredictionsDropdown'
import styles from './SmartInput.module.scss'

export function SmartInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const { isAdmin } = useAuth()
  const { openChat } = useChatbotControl()

  const { searchQuery, setSearchQuery } = useMobilePanel()
  const { results, hasResults } = useSpotlightSearch(searchQuery)

  const [localValue, setLocalValue] = useState('')

  const showPredictions = localValue.trim().length >= 2 && hasResults
  const showSendButton = isAdmin && localValue.trim().length > 0

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalValue(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value.trim())
    }, 200)
  }, [setSearchQuery])

  const handleClear = useCallback(() => {
    setLocalValue('')
    setSearchQuery('')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }, [setSearchQuery])

  const handleSend = useCallback(() => {
    const trimmed = localValue.trim()
    if (!trimmed || !isAdmin) return

    openChat()

    // Clear input
    setLocalValue('')
    setSearchQuery('')
    if (inputRef.current) inputRef.current.value = ''
  }, [localValue, isAdmin, openChat, setSearchQuery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isAdmin && localValue.trim()) {
        handleSend()
      }
    }
  }, [isAdmin, localValue, handleSend])

  const handlePredictionTap = useCallback((item: { onTap: () => void }) => {
    item.onTap()
    setLocalValue('')
    setSearchQuery('')
    if (inputRef.current) inputRef.current.value = ''
  }, [setSearchQuery])

  return (
    <div className={styles.wrapper}>
      <PredictionsDropdown
        results={results}
        visible={showPredictions}
        onItemTap={handlePredictionTap}
      />

      <div className={styles.inputPill}>
        <Search size={18} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={isAdmin ? 'Buscar o preguntar a la IA...' : 'Buscar tareas, equipos...'}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {localValue && (
          <button className={styles.clearButton} onClick={handleClear}>
            <X size={14} />
          </button>
        )}

        {showSendButton && (
          <button
            className={styles.sendButton}
            onClick={handleSend}
            aria-label="Enviar a IA"
          >
            <Sparkles size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
