'use client';

import React, { useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './SearchInput.module.scss';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * SearchInput - Componente atómico para búsqueda
 * 
 * Features:
 * - Soporte completo de teclado (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X)
 * - Animaciones GSAP al escribir
 * - Escape para limpiar
 * - Accesibilidad integrada
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  disabled = false,
  className = '',
  autoFocus = false,
  onKeyDown,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Animate input when typing
      if (inputRef.current) {
        gsap.to(inputRef.current, {
          scale: 1.02,
          duration: 0.2,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
      }
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Escape key clears the input
      if (e.key === 'Escape') {
        onChange('');
        return;
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        const target = e.currentTarget;
        
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            target.select();
            break;

          case 'c':
            e.preventDefault();
            if (target.selectionStart !== target.selectionEnd) {
              const selectedText = value.substring(
                target.selectionStart || 0,
                target.selectionEnd || 0
              );
              navigator.clipboard.writeText(selectedText).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = selectedText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
              });
            }
            break;

          case 'v':
            e.preventDefault();
            navigator.clipboard
              .readText()
              .then((text) => {
                if (
                  typeof target.selectionStart === 'number' &&
                  typeof target.selectionEnd === 'number'
                ) {
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const newValue =
                    value.substring(0, start) + text + value.substring(end);
                  onChange(newValue);
                  setTimeout(() => {
                    target.setSelectionRange(start + text.length, start + text.length);
                  }, 0);
                } else {
                  onChange(value + text);
                }
              })
              .catch(() => {
                document.execCommand('paste');
              });
            break;

          case 'x':
            e.preventDefault();
            if (target.selectionStart !== target.selectionEnd) {
              const selectedText = value.substring(
                target.selectionStart || 0,
                target.selectionEnd || 0
              );
              navigator.clipboard
                .writeText(selectedText)
                .then(() => {
                  if (
                    typeof target.selectionStart === 'number' &&
                    typeof target.selectionEnd === 'number'
                  ) {
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const newValue = value.substring(0, start) + value.substring(end);
                    onChange(newValue);
                  } else {
                    onChange('');
                  }
                })
                .catch(() => {
                  // Fallback
                  const textArea = document.createElement('textarea');
                  textArea.value = selectedText;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                  if (
                    typeof target.selectionStart === 'number' &&
                    typeof target.selectionEnd === 'number'
                  ) {
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const newValue = value.substring(0, start) + value.substring(end);
                    onChange(newValue);
                  } else {
                    onChange('');
                  }
                });
            }
            break;
        }
      }

      // Call custom onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
      }
    },
    [value, onChange, onKeyDown]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`${styles.searchInput} ${className}`}
      aria-label={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  );
};
