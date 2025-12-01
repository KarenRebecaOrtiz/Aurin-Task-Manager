"use client"

import { useCallback } from "react"
import { motion } from "framer-motion"
import styles from "./ChipSelector.module.scss"

interface ChipOption {
  value: string
  label: string
}

interface ChipSelectorProps {
  label: string
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

// Map option values to their specific color variants
const getChipVariant = (value: string): string => {
  // Priority variants
  if (value === 'Alta') return 'priority-high';
  if (value === 'Media') return 'priority-medium';
  if (value === 'Baja') return 'priority-low';

  // Status variants
  if (value === 'Backlog') return 'status-backlog';
  if (value === 'Por Iniciar') return 'status-todo';
  if (value === 'En Proceso') return 'status-in-progress';
  if (value === 'Por Finalizar') return 'status-in-review';
  if (value === 'Finalizado') return 'status-done';
  if (value === 'Cancelado') return 'status-archived';

  return 'default';
};

export function ChipSelector({
  label,
  options,
  value,
  onChange,
  required = false,
  disabled = false
}: ChipSelectorProps) {
  const handleChipClick = useCallback((optionValue: string) => {
    if (!disabled) {
      onChange(optionValue)
    }
  }, [onChange, disabled])

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
      </label>
      <div className={styles.chipsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value
          const variant = getChipVariant(option.value)
          const handleClick = () => handleChipClick(option.value)
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={handleClick}
              disabled={disabled}
              whileHover={disabled ? {} : { scale: 1.08 }}
              whileTap={disabled ? {} : { scale: 0.92 }}
              className={`${styles.chip} ${styles[variant]} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
            >
              {option.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
