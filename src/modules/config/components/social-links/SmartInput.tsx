'use client';

import type React from 'react';
import { forwardRef } from 'react';
import type { NetworkConfig } from './types';
import styles from './SmartInput.module.scss';

interface SmartInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  networkConfig: NetworkConfig | undefined;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

export const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  ({ networkConfig, onPaste, ...props }, ref) => {
    if (!networkConfig) return null;

    return (
      <div className={styles.wrapper}>
        <span className={styles.prefix} aria-hidden="true">
          {networkConfig.prefix}
        </span>
        <input
          ref={ref}
          type="text"
          onPaste={onPaste}
          placeholder={networkConfig.placeholder}
          className={styles.input}
          aria-label={`Enter your ${networkConfig.label} username`}
          {...props}
        />
      </div>
    );
  },
);
SmartInput.displayName = 'SmartInput';
