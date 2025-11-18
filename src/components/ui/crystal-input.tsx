"use client";

import * as React from "react";
import styles from "./crystal-input.module.scss";

export interface CrystalInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

const CrystalInput = React.forwardRef<HTMLInputElement, CrystalInputProps>(
  ({ className = "", type = "text", label, error, onChange, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={`${styles.input} ${error ? styles.error : ''} ${className}`}
          ref={ref}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <span
            id={`${inputId}-error`}
            className={styles.errorText}
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);
CrystalInput.displayName = "CrystalInput";

export { CrystalInput };
