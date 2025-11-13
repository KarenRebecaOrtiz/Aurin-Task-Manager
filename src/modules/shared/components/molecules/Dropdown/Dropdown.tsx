'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import styles from './Dropdown.module.scss';
import { dropdownAnimations } from './animations';

export interface DropdownItem<T = unknown> {
  id: string;
  label: string | React.ReactNode;
  value: T;
  icon?: string | React.ReactNode;
}

export interface DropdownProps<T = unknown> {
  trigger: React.ReactNode;
  items: DropdownItem<T>[];
  value?: T;
  onChange: (item: DropdownItem<T>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
}

export const Dropdown = <T = unknown,>({
  trigger,
  items,
  value,
  onChange,
  placeholder = 'Seleccionar',
  className = '',
  disabled = false,
  closeOnSelect = true,
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleItemClick = useCallback(
    (item: DropdownItem<T>) => {
      onChange(item);
      if (closeOnSelect) {
        setIsOpen(false);
      }
    },
    [onChange, closeOnSelect]
  );

  const createItemClickHandler = useCallback(
    (item: DropdownItem<T>) => () => handleItemClick(item),
    [handleItemClick]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Focus next item
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Focus previous item
          break;
        case 'Enter':
          event.preventDefault();
          // Select focused item
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <div ref={dropdownRef} className={`${styles.dropdown} ${className}`}>
      <motion.div
        className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        {...dropdownAnimations.trigger}
      >
        {trigger || (
          <span className={styles.triggerText}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        )}
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.menu}
            {...dropdownAnimations.menu}
            role="listbox"
          >
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                className={`${styles.item} ${item.value === value ? styles.selected : ''}`}
                onClick={createItemClickHandler(item)}
                {...dropdownAnimations.item(index)}
                role="option"
                aria-selected={item.value === value}
              >
                {item.icon && (
                  typeof item.icon === 'string' ? (
                    <Image src={item.icon} alt="" width={16} height={16} className={styles.itemIcon} />
                  ) : (
                    <div className={styles.itemIcon}>
                      {item.icon}
                    </div>
                  )
                )}
                <span className={styles.itemLabel}>{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
