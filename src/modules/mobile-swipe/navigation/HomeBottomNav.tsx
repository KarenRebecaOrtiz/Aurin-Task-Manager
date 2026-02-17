'use client'

import { useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useMobilePanel } from '../hooks/useMobilePanel'
import styles from './HomeBottomNav.module.scss'

export function HomeBottomNav() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { searchQuery, setSearchQuery } = useMobilePanel()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Debounce search updates
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 200)
  }, [setSearchQuery])

  const handleClear = useCallback(() => {
    setSearchQuery('')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }, [setSearchQuery])

  return (
    <div className={styles.searchPill}>
      <Search size={18} className={styles.searchIcon} />
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        placeholder="Buscar tareas, equipos, miembros..."
        defaultValue={searchQuery}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {searchQuery && (
        <button className={styles.clearButton} onClick={handleClear}>
          &times;
        </button>
      )}
    </div>
  )
}
