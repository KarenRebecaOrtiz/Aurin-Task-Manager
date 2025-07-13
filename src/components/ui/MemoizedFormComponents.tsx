// src/components/ui/MemoizedFormComponents.tsx
import React, { memo, forwardRef } from 'react';
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      whileHover={!isDisabled ? {
        scale: 1.02,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2, ease: "easeOut" }
      } : {}}
      whileTap={!isDisabled ? {
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {}}
    >
      <div className="dropdown-item-content">
        <div className="avatar-container">
          {icon ? (
            <Image
              src={icon}
              alt={iconAlt || 'Icon'}
              width={32}
              height={32}
              className="svg-icon"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <Image
              src={imageUrl || '/empty-image.png'}
              alt={name}
              width={32}
              height={32}
              className="avatar-image"
              onError={(e) => {
                e.currentTarget.src = '/empty-image.png';
              }}
            />
          )}
          {showStatusDot && (
            <div 
              className="status-dot" 
              style={{ backgroundColor: statusColor }}
            />
          )}
        </div>
        <span>
          {name}
          {role && ` (${role})`}
        </span>
      </div>
      {isSelected && " (Seleccionado)"}
    </motion.div>
  );
});

MemoizedDropdownItem.displayName = 'MemoizedDropdownItem';

// Componente memoizado para tags
interface TagProps {
  id: string;
  name: string;
  imageUrl?: string;
  onRemove: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const MemoizedTag = memo<TagProps>(({
  id,
  name,
  imageUrl,
  onRemove,
}) => {
  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onRemove(id, e);
  };

  return (
    <div key={id} className="tag">
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={name}
          width={24}
          height={24}
          style={{ borderRadius: '50%', objectFit: 'cover', marginRight: 6 }}
        />
      )}
      {name}
      <button onClick={handleRemove}>X</button>
    </div>
  );
});

MemoizedTag.displayName = 'MemoizedTag';

// Componente memoizado para inputs de búsqueda
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder: string;
  ref?: React.Ref<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const MemoizedSearchInput = memo(forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  onKeyDown,
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      ref={ref}
      className="search-input"
      value={value}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
    />
  );
}));

MemoizedSearchInput.displayName = 'MemoizedSearchInput';

// Componente memoizado para dropdown triggers
interface DropdownTriggerProps {
  value: string;
  placeholder: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  isOpen: boolean;
}

export const MemoizedDropdownTrigger = memo<DropdownTriggerProps>(({
  value,
  placeholder,
  onClick,
  isOpen,
}) => {
  return (
    <div
      className="dropdown-trigger"
      onClick={onClick}
    >
      <span>{value || placeholder}</span>
      <Image 
        src="/chevron-down.svg" 
        alt="Chevron" 
        width={16} 
        height={16}
        style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}
      />
    </div>
  );
});

MemoizedDropdownTrigger.displayName = 'MemoizedDropdownTrigger';

// Componente memoizado para botones de acción
interface ActionButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const MemoizedActionButton = memo<ActionButtonProps>(({
  onClick,
  children,
  className = '',
  disabled = false,
}) => {
  return (
    <button
      className={`action-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
});

MemoizedActionButton.displayName = 'MemoizedActionButton';

// Componente memoizado para estados vacíos
interface EmptyStateProps {
  message: string;
  isAdmin?: boolean;
}

export const MemoizedEmptyState = memo<EmptyStateProps>(({
  message,
  isAdmin = false,
}) => {
  return (
    <div className="empty-state">
      <span>
        {isAdmin
          ? message
          : `No hay coincidencias. Pide a un administrador que ${message.toLowerCase()}.`}
      </span>
    </div>
  );
});

MemoizedEmptyState.displayName = 'MemoizedEmptyState';

// Componente memoizado para fechas
interface DateDisplayProps {
  date: Date | null;
  placeholder: string;
  onClick: () => void;
}

export const MemoizedDateDisplay = memo<DateDisplayProps>(({
  date,
  placeholder,
  onClick,
}) => {
  return (
    <div
      className="date-input"
      onClick={onClick}
      style={{
        padding: "12px 16px",
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(10px)",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        fontSize: "14px",
      }}
    >
      {date ? date.toLocaleDateString("es-ES") : placeholder}
    </div>
  );
});

MemoizedDateDisplay.displayName = 'MemoizedDateDisplay';

// Componente memoizado para errores de formulario
interface FormErrorProps {
  error?: string;
}

export const MemoizedFormError = memo<FormErrorProps>(({ error }) => {
  if (!error) return null;
  
  return (
    <span className="error">{error}</span>
  );
});

MemoizedFormError.displayName = 'MemoizedFormError';

// Componente memoizado para checkboxes
interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const MemoizedCheckbox = memo<CheckboxProps>(({
  id,
  checked,
  onChange,
  label,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className="checkbox-container">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
        className="checkbox"
      />
      <label htmlFor={id} className="checkbox-label">
        {label}
      </label>
    </div>
  );
});

MemoizedCheckbox.displayName = 'MemoizedCheckbox'; 