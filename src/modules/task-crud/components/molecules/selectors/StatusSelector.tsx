/**
 * StatusSelector Component
 * Dropdown selector for task status
 */

'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { TaskStatus } from '../../../types/domain';
import { STATUS_OPTIONS } from '../../../config';
import { dropdownAnimation, transitions } from '../../../utils/animations';
import styles from './StatusSelector.module.scss';

interface StatusSelectorProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  isOpen: boolean;
  onToggle: () => void;
  position: { top: number; left: number } | null;
  disabled?: boolean;
  className?: string;
}

export const StatusSelector = forwardRef<HTMLDivElement, StatusSelectorProps>(
  ({ value, onChange, isOpen, onToggle, position, disabled, className }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    const handleSelect = (status: TaskStatus) => {
      onChange(status);
      onToggle();
    };

    return (
      <>
        <div
          ref={ref}
          className={`${styles.trigger} ${disabled ? styles.disabled : ''} ${className || ''}`}
          onClick={disabled ? undefined : onToggle}
        >
          <span>{value || 'Seleccionar'}</span>
          <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
        </div>

        {isMounted &&
          isOpen &&
          position &&
          createPortal(
            <AnimatePresence>
              <motion.div
                className={styles.dropdown}
                style={{
                  position: 'absolute',
                  top: position.top,
                  left: position.left,
                  zIndex: 150000,
                }}
                {...dropdownAnimation}
                transition={transitions.fast}
              >
                {STATUS_OPTIONS.map((option) => (
                  <motion.div
                    key={option.value}
                    className={`${styles.item} ${option.value === value ? styles.selected : ''}`}
                    onClick={() => handleSelect(option.value)}
                    whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {option.label}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
      </>
    );
  }
);

StatusSelector.displayName = 'StatusSelector';
