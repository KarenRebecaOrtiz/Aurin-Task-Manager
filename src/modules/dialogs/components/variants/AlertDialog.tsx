'use client';

import { useEffect, useCallback } from 'react';
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

interface AlertDialogProps {
  config: DialogConfig;
  onClose: () => void;
}

export function AlertDialog({ config, onClose }: AlertDialogProps) {
  const {
    title,
    description,
    size,
    variant,
    confirmText = 'Entendido',
    autoClose = false,
    autoCloseDelay = 3000,
    onConfirm,
    closeOnOverlayClick,
    closeOnEscape,
    showCloseButton,
  } = config;

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  }, [onConfirm, onClose]);

  // Auto-close functionality
  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      handleConfirm();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoClose, autoCloseDelay, handleConfirm]);

  return (
    <ResponsiveDialog open={true} onOpenChange={(open) => !open && handleConfirm()}>
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
          <div className={styles.alertContent}>
            {/* Content area can be empty for alert dialogs */}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <div className={styles.actions}>
            <motion.button
              type="button"
              onClick={handleConfirm}
              className={`${styles.confirmButton} ${styles[`variant${variant?.charAt(0).toUpperCase()}${variant?.slice(1)}`] || ''}`}
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              transition={transitions.fast}
              autoFocus
            >
              {confirmText}
            </motion.button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
