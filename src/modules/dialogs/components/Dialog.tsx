'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { DialogBaseProps, DialogSize, DialogVariant } from '../types/dialog.types';
import {
  backdropVariants,
  panelVariants,
  transitions,
} from '../config/animations';
import styles from '../styles/Dialog.module.scss';

const sizeClasses: Record<DialogSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  full: styles.sizeFull,
};

const variantClasses: Record<DialogVariant, string> = {
  default: styles.variantDefault,
  danger: styles.variantDanger,
  warning: styles.variantWarning,
  success: styles.variantSuccess,
  info: styles.variantInfo,
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'default',
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
}: DialogBaseProps) {
  // Block body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnEscape, onClose]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={styles.dialogRoot} role="dialog" aria-modal="true">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={backdropVariants}
            transition={transitions.fast}
            className={styles.backdrop}
            onClick={handleBackdropClick}
          />

          <div className={styles.container}>
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={panelVariants}
              transition={transitions.normal}
              className={`${styles.panel} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
              onClick={handlePanelClick}
            >
              {showCloseButton && (
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              )}

              {title && (
                <h2 className={styles.title}>{title}</h2>
              )}

              {description && (
                <p className={styles.description}>{description}</p>
              )}

              {children && <div className={styles.content}>{children}</div>}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
