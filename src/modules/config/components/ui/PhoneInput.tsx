'use client';

import React from 'react';
import { CrystalInput, CrystalPhoneSelect } from '@/components/ui';
import styles from './PhoneInput.module.scss';

interface PhoneInputProps {
  label?: string;
  ladaValue: string;
  phoneValue: string;
  onLadaChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Teléfono de Contacto',
  ladaValue,
  phoneValue,
  onLadaChange,
  onPhoneChange,
  disabled = false,
  error,
  placeholder = 'XXX-XXX-XX-XX',
  maxLength = 15,
  onKeyDown,
}) => {
  return (
    <div className={styles.phoneInputWrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.phoneInputContainer}>
        <CrystalPhoneSelect
          value={ladaValue}
          onChange={onLadaChange}
          disabled={disabled}
        />
        <CrystalInput
          name="phone"
          value={phoneValue}
          onChange={onPhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          onKeyDown={onKeyDown}
          error={error}
        />
      </div>
    </div>
  );
};
