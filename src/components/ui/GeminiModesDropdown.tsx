// src/components/ui/GeminiModesDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { useGeminiModes, type GeminiMode } from '@/hooks/useGeminiModes';
import styles from './GeminiModesDropdown.module.scss';

interface GeminiModesDropdownProps {
  onModeSelect?: (mode: GeminiMode) => void;
  className?: string;
  disabled?: boolean;
}

export const GeminiModesDropdown: React.FC<GeminiModesDropdownProps> = ({
  onModeSelect,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { modes, currentMode, selectMode, getCurrentModeConfig } = useGeminiModes();

  const currentModeConfig = getCurrentModeConfig();

  const handleModeSelect = (mode: GeminiMode) => {
    selectMode(mode);
    onModeSelect?.(mode);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cerrar dropdown con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div 
      ref={dropdownRef}
      className={`${styles.container} ${className}`}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className={styles.triggerContent}>
          {currentModeConfig ? (
            <>
              <span className={styles.modeIcon}>
                <i className={`icon-${currentModeConfig.icon}`} />
              </span>
              <span className={styles.modeLabel}>
                {currentModeConfig.label}
              </span>
            </>
          ) : (
            <span className={styles.placeholder}>
              Seleccionar modo
            </span>
          )}
        </div>
        <ChevronDown 
          className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
          size={16}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className={styles.dropdownContent}>
              {modes.map((mode) => (
                                  <button
                    key={mode.id}
                    type="button"
                    className={`${styles.modeOption} ${
                      currentMode === mode.id ? styles.selected : ''
                    }`}
                    onClick={() => handleModeSelect(mode.id)}
                  >
                  <div className={styles.modeOptionContent}>
                    <span className={styles.modeOptionIcon}>
                      <i className={`icon-${mode.icon}`} />
                    </span>
                    <div className={styles.modeOptionText}>
                      <span className={styles.modeOptionLabel}>
                        {mode.label}
                      </span>
                      <span className={styles.modeOptionDescription}>
                        {mode.description}
                      </span>
                    </div>
                  </div>
                  {currentMode === mode.id && (
                    <Check 
                      className={styles.checkIcon}
                      size={16}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
