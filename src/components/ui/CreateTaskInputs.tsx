import React, { memo, useCallback } from 'react';
import { Controller, Control, FieldValues } from 'react-hook-form';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { createPortal } from 'react-dom';

// Componente memoizado para input de texto
export const MemoizedTextInput = memo(({
  name,
  control,
  placeholder,
  label,
  subtitle,
  className = '',
  ...props
}: {
  name: string;
  control: Control<FieldValues>;
  placeholder: string;
  label: string;
  subtitle?: string;
  className?: string;
  [key: string]: unknown;
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label className="label">{label}</label>
      {subtitle && <div className="section-subtitle">{subtitle}</div>}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <input
            {...field}
            className={`input ${fieldState.error ? 'error' : ''}`}
            placeholder={placeholder}
            {...props}
          />
        )}
      />
    </div>
  );
});

MemoizedTextInput.displayName = 'MemoizedTextInput';

// Componente memoizado para dropdown
export const MemoizedDropdown = memo(({
  name,
  control,
  options,
  placeholder,
  label,
  subtitle,
  isOpen,
  onToggle,
  onSelect,
  className = '',
  ...props
}: {
  name: string;
  control: Control<FieldValues>;
  options: Array<{ id: string; name: string; imageUrl?: string }>;
  placeholder: string;
  label: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  className?: string;
  [key: string]: unknown;
}) => {
  const handleSelect = useCallback((id: string) => {
    onSelect(id);
    onToggle();
  }, [onSelect, onToggle]);

  return (
    <div className={`form-group ${className}`}>
      <label className="label">{label}</label>
      {subtitle && <div className="section-subtitle">{subtitle}</div>}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <div className="dropdown-container">
            <input
              {...field}
              className={`input ${fieldState.error ? 'error' : ''}`}
              placeholder={placeholder}
              onClick={onToggle}
              readOnly
              {...props}
            />
            {isOpen && createPortal(
              <motion.div
                className="dropdown"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {options.map((option) => (
                  <motion.div
                    key={option.id}
                    className="dropdown-item"
                    onClick={() => handleSelect(option.id)}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      transition: { duration: 0.2, ease: "easeOut" }
                    }}
                    whileTap={{
                      scale: 0.98,
                      transition: { duration: 0.1 }
                    }}
                  >
                    <div className="dropdown-item-content">
                      {option.imageUrl && (
                        <div className="avatar-container">
                          <Image
                            src={option.imageUrl}
                            alt={option.name}
                            width={32}
                            height={32}
                            className="avatar-image"
                          />
                        </div>
                      )}
                      <span>{option.name}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>,
              document.body
            )}
          </div>
        )}
      />
    </div>
  );
});

MemoizedDropdown.displayName = 'MemoizedDropdown';

// Componente memoizado para date picker
export const MemoizedDatePicker = memo(({
  name,
  control,
  placeholder,
  label,
  subtitle,
  isOpen,
  onToggle,
  className = '',
  ...props
}: {
  name: string;
  control: Control<FieldValues>;
  placeholder: string;
  label: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  [key: string]: unknown;
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label className="label">{label}</label>
      {subtitle && <div className="section-subtitle">{subtitle}</div>}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <div className="date-picker-container">
            <input
              {...field}
              className={`input ${fieldState.error ? 'error' : ''}`}
              placeholder={placeholder}
              onClick={onToggle}
              readOnly
              {...props}
            />
            {isOpen && createPortal(
              <motion.div
                className="date-picker-dropdown"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Date picker content */}
              </motion.div>,
              document.body
            )}
          </div>
        )}
      />
    </div>
  );
});

MemoizedDatePicker.displayName = 'MemoizedDatePicker'; 