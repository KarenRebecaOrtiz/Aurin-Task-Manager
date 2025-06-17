'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import styles from './StackInput.module.scss';

interface StackInputProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
}

const StackInput: React.FC<StackInputProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Escribe una tecnología...',
  disabled = false,
  className,
  maxSelections = 20,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Create portal container
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'stack-input-portal';
    document.body.appendChild(container);
    setPortalContainer(container);
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Filter options based on input
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  // Handle option selection
  const handleSelect = (option: string) => {
    if (value.length >= maxSelections) return;
    if (!value.includes(option)) {
      onChange([...value, option]);
    }
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle tag removal
  const handleRemoveTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // GSAP animation
  useEffect(() => {
    if (isOpen && dropdownRef.current && portalContainer) {
      dropdownRef.current.style.display = 'block';
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        dropdownRef.current.querySelectorAll(`.${styles.dropdownItem}`),
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.2,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.1,
        }
      );
    } else if (!isOpen && dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          dropdownRef.current!.style.display = 'none';
        },
      });
    }
  }, [isOpen, portalContainer]);

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    };
  };

  const dropdownPosition = getDropdownPosition();

  const DropdownMenu = () => (
    <div
      ref={dropdownRef}
      className={styles.dropdownMenu}
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: triggerRef.current?.offsetWidth,
      }}
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <div
            key={option}
            className={`${styles.dropdownItem} ${
              value.includes(option) ? styles.selected : ''
            }`}
            onClick={() => handleSelect(option)}
          >
            {option}
          </div>
        ))
      ) : (
        <div className={styles.noMatches}>No se encontraron coincidencias</div>
      )}
    </div>
  );

  return (
    <div className={`${styles.stackInput} ${className || ''}`}>
      <div
        ref={triggerRef}
        className={`${styles.inputContainer} ${disabled ? styles.disabled : ''}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className={styles.input}
        />
      </div>
      {value.length > 0 && (
        <div className={styles.tagsContainer}>
          {value.map((tag) => (
            <div key={tag} className={styles.tag}>
              <span>{tag}</span>
              {!disabled && (
                <button
                  className={styles.removeTagButton}
                  onClick={() => handleRemoveTag(tag)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {isOpen && portalContainer && createPortal(<DropdownMenu />, portalContainer)}
    </div>
  );
};

export default StackInput;