'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useMobilePanel } from '../hooks/useMobilePanel'
import { useSpotlightSearch } from '../hooks/useSpotlightSearch'
import { PredictionsDropdown } from './PredictionsDropdown'
import styles from './SmartInput.module.scss'

export function SmartInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const { searchQuery, setSearchQuery } = useMobilePanel()
  const { results, hasResults } = useSpotlightSearch(searchQuery)

  const [localValue, setLocalValue] = useState('')

  const showPredictions = localValue.trim().length >= 2 && hasResults

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
          placeholder="Buscar tareas, equipos..."
          onChange={handleChange}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {localValue && (
          <button className={styles.clearButton} onClick={handleClear}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
