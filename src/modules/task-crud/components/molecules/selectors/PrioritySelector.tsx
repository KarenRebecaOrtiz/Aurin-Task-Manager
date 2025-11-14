/**
 * PrioritySelector Component
 * Dropdown selector for task priority
 */

'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { TaskPriority } from '../../../types/domain';
import { PRIORITY_OPTIONS } from '../../../config';
import { dropdownAnimation, transitions } from '../../../utils/animations';
import styles from './PrioritySelector.module.scss';

interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  isOpen: boolean;
  onToggle: () => void;
  position: { top: number; left: number } | null;
  disabled?: boolean;
  className?: string;
}

export const PrioritySelector = forwardRef<HTMLDivElement, PrioritySelectorProps>(
  ({ value, onChange, isOpen, onToggle, position, disabled, className }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    const handleSelect = (priority: TaskPriority) => {
      onChange(priority);
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
                {PRIORITY_OPTIONS.map((option) => (
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

PrioritySelector.displayName = 'PrioritySelector';
