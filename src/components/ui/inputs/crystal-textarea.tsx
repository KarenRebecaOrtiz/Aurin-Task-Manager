"use client";

import * as React from "react";
import styles from "./crystal-textarea.module.scss";

export interface CrystalTextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
}

const CrystalTextarea = React.forwardRef<HTMLTextAreaElement, CrystalTextareaProps>(
  ({ className = "", label, error, showCharacterCount, maxLength, id, value, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const characterCount = typeof value === 'string' ? value.length : 0;
    const remaining = maxLength ? maxLength - characterCount : 0;

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={`${styles.textarea} ${error ? styles.error : ''} ${className}`}
          ref={ref}
          maxLength={maxLength}
          value={value}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : showCharacterCount
                ? `${textareaId}-count`
                : undefined
          }
          {...props}
        />
        {showCharacterCount && maxLength && (
          <span
            id={`${textareaId}-count`}
            className={styles.characterCount}
            role="status"
            aria-live="polite"
          >
            <span>{remaining}</span> caracteres restantes
          </span>
        )}
        {error && (
          <span
            id={`${textareaId}-error`}
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
CrystalTextarea.displayName = "CrystalTextarea";

export { CrystalTextarea };
