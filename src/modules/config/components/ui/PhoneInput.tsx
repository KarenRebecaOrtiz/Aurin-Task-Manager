'use client';

import React from 'react';
import { CrystalInput } from '@/components/ui';
import { CountrySelect, getCountryByDialCode, getDefaultCountry, type Country } from '../phone-input';
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
  // Find country by dial code (lada)
  const currentCountry = React.useMemo(() => {
    // Try to find by dial code (e.g., "+52")
    const country = getCountryByDialCode(ladaValue);
    if (country) return country;

    // For backwards compatibility, default to Mexico if not found
    return getDefaultCountry();
  }, [ladaValue]);

  const handleCountryChange = (country: Country) => {
    onLadaChange(country.dialCode);
  };

  return (
    <div className={styles.phoneInputWrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.phoneInputContainer}>
        <CountrySelect
          value={currentCountry?.code || 'MX'}
          onChange={handleCountryChange}
          disabled={disabled}
          hasError={!!error}
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
          variant="no-icon"
        />
      </div>
    </div>
  );
};
