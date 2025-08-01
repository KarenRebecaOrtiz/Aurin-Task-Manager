"use client";

import * as React from "react";
import styles from "../ConfigPage.module.scss";

// Función simple para combinar clases
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface WebsiteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const WebsiteInput = React.forwardRef<HTMLInputElement, WebsiteInputProps>(
  ({ value = "", onChange, placeholder = "yourwebsite.com", disabled, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
    };

    return (
      <div className={styles.websiteInputContainer}>
        <span className={styles.crystalizedSpan}>
          https://
        </span>
        <input
          ref={ref}
          className={cn(styles.websiteInput, className)}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          type="text"
          disabled={disabled}
          {...props}
        />
      </div>
    );
  },
);
WebsiteInput.displayName = "WebsiteInput";

export { WebsiteInput }; 