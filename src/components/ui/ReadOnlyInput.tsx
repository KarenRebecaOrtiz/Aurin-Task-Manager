"use client";

import * as React from "react";
import styles from "../ConfigPage.module.scss";

interface ReadOnlyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  isReadOnly?: boolean;
  className?: string;
}

const ReadOnlyInput = React.forwardRef<HTMLInputElement, ReadOnlyInputProps>(
  ({ value = "", onChange, placeholder, isReadOnly = false, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isReadOnly) {
        onChange?.(e.target.value);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permitir todas las operaciones de teclado incluso en modo solo lectura
      if (isReadOnly) {
        // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, etc.
        if (e.ctrlKey || e.metaKey) {
          return; // Permitir atajos de teclado
        }
        // Bloquear solo la escritura directa
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
    };

    return (
      <input
        ref={ref}
        className={`${styles.input} ${isReadOnly ? styles.readOnly : ''} ${className || ''}`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        readOnly={isReadOnly}
        {...props}
      />
    );
  },
);

ReadOnlyInput.displayName = "ReadOnlyInput";

export { ReadOnlyInput }; 