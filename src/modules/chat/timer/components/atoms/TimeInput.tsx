/**
 * Timer Module - Time Input Component
 *
 * Input component for entering hours and minutes manually
 *
 * @module timer/components/atoms/TimeInput
 */

'use client';

import NumberFlow from '@number-flow/react';
import { Minus, Plus } from 'lucide-react';
import * as React from 'react';
import type { TimeInputProps } from '../../types/timer.types';
import styles from './TimeInput.module.scss';

/**
 * TimeInput Component
 *
 * Enhanced time input with increment/decrement buttons and NumberFlow animations
 *
 * @param value - Current numeric value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param onChange - Callback when value changes
 * @param label - Label text to display above input
 * @param type - Type of input ('hours' or 'minutes')
 * @param error - Error message to display
 */
export function TimeInput({
  value = 0,
  min = 0,
  max = 23,
  onChange,
  label,
  type = 'hours',
  error
}: TimeInputProps) {
  const defaultValue = React.useRef(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [animated, setAnimated] = React.useState(true);
  const [showCaret, setShowCaret] = React.useState(true);

  // Handle input changes
  const handleInput: React.ChangeEventHandler<HTMLInputElement> = ({ currentTarget: el }) => {
    setAnimated(false);
    let next = value;

    if (el.value === '') {
      next = defaultValue.current;
    } else {
      const num = el.valueAsNumber;
      if (!isNaN(num) && min <= num && num <= max) {
        next = num;
      }
    }

    // Manually update the input.value in case the number stays the same e.g. 09 == 9
    el.value = String(next);
    onChange?.(next);
  };

  // Handle increment/decrement button clicks
  const handlePointerDown = (diff: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
    setAnimated(true);

    if (event.pointerType === 'mouse') {
      event?.preventDefault();
      inputRef.current?.focus();
    }

    let newVal = value + diff;

    // Handle wraparound for better UX
    if (newVal > max) {
      newVal = min; // Wrap to minimum
    } else if (newVal < min) {
      newVal = max; // Wrap to maximum
    }

    onChange?.(newVal);
  };

  // Handle keyboard arrow keys
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setAnimated(true);
      const newVal = value >= max ? min : value + 1;
      onChange?.(newVal);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setAnimated(true);
      const newVal = value <= min ? max : value - 1;
      onChange?.(newVal);
    }
  };

  return (
    <div className={`${styles.timeInputContainer} ${error ? styles.hasError : ''}`}>
      {label && (
        <span className={styles.label}>
          {label}
        </span>
      )}

      <div className={styles.inputGroup}>
        <button
          aria-hidden="true"
          tabIndex={-1}
          className={styles.decrementButton}
          disabled={min != null && value <= min}
          onPointerDown={handlePointerDown(-1)}
          type="button"
        >
          <Minus className={styles.icon} absoluteStrokeWidth strokeWidth={3.5} />
        </button>

        <div className={styles.numberContainer}>
          <input
            ref={inputRef}
            className={`${styles.hiddenInput} ${styles.spinHide} ${showCaret ? styles.showCaret : styles.hideCaret}`}
            style={{ fontKerning: 'none' }}
            type="number"
            min={min}
            step={1}
            autoComplete="off"
            inputMode="numeric"
            max={max}
            value={value}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            aria-label={label}
          />
          <NumberFlow
            value={value}
            locales="en-US"
            format={{ useGrouping: false, minimumIntegerDigits: 2 }}
            aria-hidden="true"
            animated={animated}
            onAnimationsStart={() => setShowCaret(false)}
            onAnimationsFinish={() => setShowCaret(true)}
            className={styles.numberFlow}
            willChange
          />
        </div>

        <button
          aria-hidden="true"
          tabIndex={-1}
          className={styles.incrementButton}
          disabled={max != null && value >= max}
          onPointerDown={handlePointerDown(1)}
          type="button"
        >
          <Plus className={styles.icon} absoluteStrokeWidth strokeWidth={3.5} />
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
    </div>
  );
}
