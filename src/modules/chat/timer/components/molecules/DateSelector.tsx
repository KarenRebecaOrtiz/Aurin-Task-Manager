/**
 * Timer Module - Date Selector Component
 *
 * Calendar selector for choosing work date (cannot select future dates)
 *
 * @module timer/components/molecules/DateSelector
 */

'use client';

import React from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/style.css';
import type { DateSelectorProps } from '../../types/timer.types';
import styles from './DateSelector.module.scss';

/**
 * DateSelector Component
 *
 * Calendar component for selecting work dates
 * - Prevents selection of future dates
 * - Spanish locale
 * - Week starts on Monday
 *
 * @param value - Currently selected date
 * @param onChange - Callback when date changes
 * @param error - Error message to display
 * @param disabled - Whether the selector is disabled
 */
export function DateSelector({
  value,
  onChange,
  error,
  disabled = false
}: DateSelectorProps) {
  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(date);
    }
  };

  // Set today at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Disable function for future dates
  const disableFutureDates = (date: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  return (
    <div className={`${styles.dateSelector} ${error ? styles.hasError : ''}`}>
      <div className={styles.calendarContainer}>
        <DayPicker
          mode="single"
          selected={value}
          onSelect={handleSelect}
          locale={es}
          weekStartsOn={1}
          disabled={disabled || disableFutureDates}
          modifiers={{
            disabled: disableFutureDates
          }}
          modifiersStyles={{
            disabled: {
              color: '#9ca3af',
              textDecoration: 'line-through',
              cursor: 'not-allowed',
              opacity: 0.5
            }
          }}
          className={styles.dayPicker}
        />
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default DateSelector;
