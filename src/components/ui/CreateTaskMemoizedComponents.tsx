// src/components/ui/CreateTaskMemoizedComponents.tsx
import React, { memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// Componente memoizado para elementos de dropdown
interface DropdownItemProps {
  id: string;
  name: string;
  imageUrl?: string;
  role?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick: (id: string, e: React.MouseEvent<HTMLDivElement>) => void;
  showStatusDot?: boolean;
  statusColor?: string;
  icon?: string;
  iconAlt?: string;
}

export const MemoizedDropdownItem = memo<DropdownItemProps>(({
  id,
  name,
  imageUrl,
  role,
  isSelected = false,
  isDisabled = false,
  onClick,
  showStatusDot = false,
  statusColor = '#178d00',
  icon,
  iconAlt,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDisabled) {
      onClick(id, e);
    }
  };

  return (
    <motion.div
      className={`dropdown-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={handleClick}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="item-content">
        {imageUrl ? (
          <div className="avatar-container">
            <Image
              src={imageUrl}
              alt={name}
              width={32}
              height={32}
              className="avatar"
            />
            {showStatusDot && (
              <div 
                className="status-dot"
                style={{ backgroundColor: statusColor }}
              />
            )}
          </div>
        ) : icon ? (
          <div className="icon-container">
            <Image
              src={icon}
              alt={iconAlt || name}
              width={24}
              height={24}
              className="icon"
            />
          </div>
        ) : (
          <div className="default-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className="item-info">
          <span className="name">{name}</span>
          {role && <span className="role">{role}</span>}
        </div>
      </div>
    </motion.div>
  );
});

MemoizedDropdownItem.displayName = 'MemoizedDropdownItem';

// Componente memoizado para tags
interface TagProps {
  id: string;
  name: string;
  imageUrl?: string;
  onRemove: (id: string) => void;
  type: 'user' | 'client';
}

export const MemoizedTag = memo<TagProps>(({
  id,
  name,
  imageUrl,
  onRemove,
  type,
}) => {
  const handleRemove = () => {
    onRemove(id);
  };

  return (
    <motion.div
      className={`tag ${type}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      layout
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={name}
          width={24}
          height={24}
          className="tag-avatar"
        />
      )}
      <span className="tag-name">{name}</span>
      <button
        type="button"
        className="remove-button"
        onClick={handleRemove}
        aria-label={`Remove ${name}`}
      >
        <Image
          src="/x.svg"
          alt="Remove"
          width={16}
          height={16}
        />
      </button>
    </motion.div>
  );
});

MemoizedTag.displayName = 'MemoizedTag';

// Componente memoizado para inputs de búsqueda
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

export const MemoizedSearchInput = memo<SearchInputProps>(({
  value,
  onChange,
  placeholder,
  onFocus,
  onBlur,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      className="search-input"
    />
  );
});

MemoizedSearchInput.displayName = 'MemoizedSearchInput';

// Componente memoizado para triggers de dropdown
interface DropdownTriggerProps {
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const MemoizedDropdownTrigger = memo<DropdownTriggerProps>(({
  isOpen,
  onClick,
  children,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      className={`dropdown-trigger ${isOpen ? 'open' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <Image
        src="/chevron-down.svg"
        alt="Toggle dropdown"
        width={16}
        height={16}
        className={`chevron ${isOpen ? 'rotated' : ''}`}
      />
    </button>
  );
});

MemoizedDropdownTrigger.displayName = 'MemoizedDropdownTrigger';

// Componente memoizado para botones de acción
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const MemoizedActionButton = memo<ActionButtonProps>(({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      className={`action-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {loading ? (
        <div className="loading-spinner" />
      ) : (
        children
      )}
    </motion.button>
  );
});

MemoizedActionButton.displayName = 'MemoizedActionButton';

// Componente memoizado para estados vacíos
interface EmptyStateProps {
  message: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
}

export const MemoizedEmptyState = memo<EmptyStateProps>(({
  message,
  icon,
  actionText,
  onAction,
}) => {
  return (
    <div className="empty-state">
      {icon && (
        <Image
          src={icon}
          alt="Empty state"
          width={48}
          height={48}
          className="empty-icon"
        />
      )}
      <p className="empty-message">{message}</p>
      {actionText && onAction && (
        <button
          type="button"
          className="empty-action"
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
});

MemoizedEmptyState.displayName = 'MemoizedEmptyState';

// Componente memoizado para mostrar fechas
interface DateDisplayProps {
  date: Date | null;
  placeholder: string;
  onClick: () => void;
  isOpen: boolean;
}

export const MemoizedDateDisplay = memo<DateDisplayProps>(({
  date,
  placeholder,
  onClick,
  isOpen,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`date-display ${isOpen ? 'open' : ''}`}
      onClick={onClick}
    >
      <span className="date-text">
        {date ? formatDate(date) : placeholder}
      </span>
      <Image
        src="/Calendar.svg"
        alt="Calendar"
        width={16}
        height={16}
        className="calendar-icon"
      />
    </div>
  );
});

MemoizedDateDisplay.displayName = 'MemoizedDateDisplay';

// Componente memoizado para errores de formulario
interface FormErrorProps {
  error?: string;
  className?: string;
}

export const MemoizedFormError = memo<FormErrorProps>(({
  error,
  className = '',
}) => {
  if (!error) return null;

  return (
    <motion.div
      className={`form-error ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {error}
    </motion.div>
  );
});

MemoizedFormError.displayName = 'MemoizedFormError';

// Componente memoizado para checkboxes
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const MemoizedCheckbox = memo<CheckboxProps>(({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={`checkbox-container ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="checkbox-input"
      />
      <span className="checkbox-custom" />
      <span className="checkbox-label">{label}</span>
    </label>
  );
});

MemoizedCheckbox.displayName = 'MemoizedCheckbox'; 