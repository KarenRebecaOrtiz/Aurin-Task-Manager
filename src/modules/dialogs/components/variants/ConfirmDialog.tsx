'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter
} from '../DialogPrimitives';
import { DialogConfig } from '../../types/dialog.types';
import { buttonVariants, transitions } from '../../config/animations';
import styles from '../../styles/Dialog.module.scss';

interface ConfirmDialogProps {
  config: DialogConfig;
  onClose: () => void;
}

export function ConfirmDialog({ config, onClose }: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    title,
    description,
    size,
    variant,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    closeOnOverlayClick,
    closeOnEscape,
    showCloseButton,
  } = config;

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      if (onConfirm) {
        await onConfirm();
      }
      onClose();
    } catch (error) {
      console.error('Error in confirm action:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  }, [onCancel, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <ResponsiveDialog open={true} onOpenChange={(open) => !open && handleCancel()}>
      <ResponsiveDialogContent
        size={size}
        closeOnOverlayClick={closeOnOverlayClick}
        closeOnEscape={closeOnEscape}
        showCloseButton={showCloseButton}
      >
        <ResponsiveDialogHeader>
          {title && <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>}
          {description && <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>}
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className={styles.confirmContent} onKeyDown={handleKeyDown}>
            {/* Content area can be empty for confirm dialogs */}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <div className={styles.actions}>
            <motion.button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={isLoading}
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              transition={transitions.fast}
            >
              {cancelText}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`${styles.confirmButton} ${styles[`variant${variant?.charAt(0).toUpperCase()}${variant?.slice(1)}`] || ''}`}
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              transition={transitions.fast}
              autoFocus
            >
              {isLoading ? 'Procesando...' : confirmText}
            </motion.button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
