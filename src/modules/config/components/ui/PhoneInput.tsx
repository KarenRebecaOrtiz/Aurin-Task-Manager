'use client';

import React from 'react';
import { CountrySelect, PhoneField, getCountryByDialCode, getDefaultCountry, type Country } from '../phone-input';
import { ErrorMessage } from '@/modules/config/phone-number-input/components/phone-input/atoms/error-message';
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

  // Extract only digits from the phone value for PhoneField
  const rawPhoneValue = phoneValue.replace(/\D/g, '');

  const handlePhoneFieldChange = (value: string) => {
    onPhoneChange(value);
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
        <PhoneField
          id="config-phone"
          value={rawPhoneValue}
          onChange={handlePhoneFieldChange}
          countryCode={currentCountry?.code || 'MX'}
          hasError={!!error}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
      <ErrorMessage message={error} />
    </div>
  );
};
