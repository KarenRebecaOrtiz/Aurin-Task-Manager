/**
 * SearchInput Component
 *
 * Input de búsqueda para el Command Palette con icono y hint de atajo.
 * @module command-palette/components/header/SearchInput
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getPlatformShortcut, KEYBOARD_SHORTCUTS } from '../../constants/shortcuts';
import styles from '../../styles/command-palette.module.scss';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showAIHint?: boolean;
  onAIPrompt?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  autoFocus = true,
  showAIHint = true,
  onAIPrompt,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus cuando se monta
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={styles.searchInputWrapper}>
      <Search className={styles.searchInputIcon} size={18} />
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {showAIHint && (
        <div className={styles.searchHint}>
          <span>AI</span>
          <span className={styles.shortcutKey}>Tab</span>
        </div>
      )}
    </div>
  );
}

export default SearchInput;
