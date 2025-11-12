'use client';

import React, { useCallback, useRef, useId } from 'react';
import { gsap } from 'gsap';
import styles from './Input.module.scss';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Input - A general-purpose animated input component.
 *
 * Features:
 * - GSAP animations on interaction.
 * - Advanced keyboard support (Ctrl+A, C, V, X).
 * - Built-in label and error message display.
 * - Accessibility attributes.
 */
export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  label,
  error,
  placeholder,
  disabled = false,
  className = '',
  autoFocus = false,
  onKeyDown,
  name,
  type = 'text',
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Animate input when typing
      if (inputRef.current) {
        gsap.to(inputRef.current, {
          scale: 1.01,
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
      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        const target = e.currentTarget;
        
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            target.select();
            break;

          case 'c':
            // The browser's default copy is usually sufficient.
            // This custom implementation is here if needed for special cases.
            break;

          case 'v':
            // The browser's default paste is usually sufficient.
            break;

          case 'x':
            // The browser's default cut is usually sufficient.
            break;
        }
      }

      // Call custom onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
      }
    },
    [onKeyDown]
  );

  const inputClasses = `${styles.input} ${className} ${error ? styles.error : ''}`;

  return (
    <div className={styles.inputContainer}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input
        id={id}
        ref={inputRef}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={inputClasses}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && <p id={`${id}-error`} className={styles.errorText} role="alert">{error}</p>}
    </div>
  );
};
