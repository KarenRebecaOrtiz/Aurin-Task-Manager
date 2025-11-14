/**
 * DateSelector Component
 * Date picker with portal rendering
 */

'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { dropdownAnimation, transitions } from '../../../utils/animations';
import { formatDate } from '../../../utils/helpers';
import styles from './DateSelector.module.scss';

interface DateSelectorProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  position: { top: number; left: number } | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DateSelector = forwardRef<HTMLDivElement, DateSelectorProps>(
  ({ value, onChange, isOpen, onToggle, position, placeholder = 'Selecciona una fecha', disabled, className }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    const handleSelect = (date: Date | undefined) => {
      onChange(date || null);
      onToggle();
    };

    return (
      <>
        <div
          ref={ref}
          className={`${styles.trigger} ${disabled ? styles.disabled : ''} ${className || ''}`}
          onClick={disabled ? undefined : onToggle}
        >
          <span>{value ? formatDate(value) : placeholder}</span>
        </div>

        {isMounted &&
          isOpen &&
          position &&
          createPortal(
            <AnimatePresence>
              <motion.div
                className={styles.calendar}
                style={{
                  position: 'absolute',
                  top: position.top,
                  left: position.left,
                  zIndex: 150000,
                }}
                {...dropdownAnimation}
                transition={transitions.fast}
              >
                <DayPicker
                  mode="single"
                  selected={value || undefined}
                  onSelect={handleSelect}
                  locale={es}
                  className={styles.dayPicker}
                />
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
      </>
    );
  }
);

DateSelector.displayName = 'DateSelector';
