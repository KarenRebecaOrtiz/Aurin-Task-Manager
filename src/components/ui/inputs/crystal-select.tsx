"use client";

import * as React from "react";
import styles from "./crystal-select.module.scss";

export interface CrystalSelectProps extends React.ComponentProps<"select"> {
  label?: string;
  error?: string;
}

const CrystalSelect = React.forwardRef<HTMLSelectElement, CrystalSelectProps>(
  ({ className = "", label, error, children, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <select
          id={selectId}
          className={`${styles.select} ${error ? styles.error : ''} ${className}`}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span
            id={`${selectId}-error`}
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
CrystalSelect.displayName = "CrystalSelect";

export { CrystalSelect };
