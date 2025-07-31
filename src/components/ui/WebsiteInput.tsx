"use client";

import * as React from "react";
import { Input } from "./Input";
import styles from "../ConfigPage.module.scss";

// Función simple para combinar clases
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface WebsiteInputProps extends Omit<React.ComponentProps<typeof Input>, 'type' | 'onChange'> {
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
      <div className={styles.websiteInputContainer} style={{display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center'}}>
        <span 
          style={{
            display: 'flex',
            height: '36px',
            maxWidth: '30%',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(241, 245, 249, 0.8)',
            padding: '8px 12px',
            fontSize: '14px',
            color: '#0F172A',
            boxShadow: '-4px -4px 8px rgba(255, 255, 255, 0.8), 4px 4px 8px rgba(0, 0, 0, 0.05), inset -2px -2px 4px rgba(255, 255, 255, 0.9), inset 2px 2px 6px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(241, 245, 249, 0.9)';
            e.currentTarget.style.boxShadow = '-6px -6px 12px rgba(255, 255, 255, 0.9), 6px 6px 12px rgba(0, 0, 0, 0.08), inset -3px -3px 6px rgba(255, 255, 255, 1), inset 3px 3px 8px rgba(0, 0, 0, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)';
            e.currentTarget.style.boxShadow = '-4px -4px 8px rgba(255, 255, 255, 0.8), 4px 4px 8px rgba(0, 0, 0, 0.05), inset -2px -2px 4px rgba(255, 255, 255, 0.9), inset 2px 2px 6px rgba(0, 0, 0, 0.05)';
          }}
        >
          https://
        </span>
        <Input
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