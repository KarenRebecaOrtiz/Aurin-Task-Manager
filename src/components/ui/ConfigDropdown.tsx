// src/components/ui/ConfigDropdown.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import styles from './ConfigDropdown.module.scss';

interface Option {
  value: string;
  label: string;
}

interface ConfigDropdownProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  isMulti?: boolean;
  disabled?: boolean;
  className?: string;
}

const ConfigDropdown: React.FC<ConfigDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isMulti = false,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Create portal container
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'custom-dropdown-portal';
    document.body.appendChild(container);
    setPortalContainer(container);
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Handle toggle
  const handleToggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  // Handle selection
  const handleSelect = (option: Option) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter((v) => v !== option.value)
        : [...currentValues, option.value];
      onChange(newValues);
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
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

  // Get display value
  const getDisplayValue = () => {
    if (isMulti && Array.isArray(value)) {
      const selectedLabels = options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label);
      return selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder;
    }
    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  // GSAP animation
  useEffect(() => {
    if (isOpen && dropdownRef.current && portalContainer) {
      dropdownRef.current.style.display = 'block';
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' },
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
        },
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
      {options.map((option) => (
        <div
          key={option.value}
          className={`${styles.dropdownItem} ${
            isMulti
              ? value.includes(option.value)
                ? styles.selected
                : ''
              : value === option.value
              ? styles.selected
              : ''
          }`}
          onClick={() => handleSelect(option)}
        >
          {option.label}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`${styles.dropdown} ${className || ''}`}>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}
        onClick={handleToggle}
      >
        <span>{getDisplayValue()}</span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && portalContainer && createPortal(<DropdownMenu />, portalContainer)}
    </div>
  );
};

export default ConfigDropdown;