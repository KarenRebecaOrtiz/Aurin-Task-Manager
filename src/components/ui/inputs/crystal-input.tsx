"use client";

import * as React from "react";
import { FileText, AlignLeft } from "lucide-react";
import styles from "./crystal-input.module.scss";

export interface CrystalInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
}

const CrystalInput = React.forwardRef<HTMLInputElement, CrystalInputProps>(
  ({ className = "", type = "text", label, error, onChange, id, icon, name, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    // Determine default icon based on name/id
    const getDefaultIcon = () => {
      if (icon !== undefined) return icon;

      const fieldName = (name || id || '').toLowerCase();
      if (fieldName.includes('name') || fieldName.includes('task')) {
        return <FileText size={16} className={styles.icon} />;
      }
      if (fieldName.includes('description') || fieldName.includes('objetivo')) {
        return <AlignLeft size={16} className={styles.icon} />;
      }
      return <FileText size={16} className={styles.icon} />;
    };

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputWrapper}>
          {getDefaultIcon()}
          <input
            id={inputId}
            type={type}
            name={name}
            className={`${styles.input} ${error ? styles.error : ''} ${className}`}
            ref={ref}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
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
