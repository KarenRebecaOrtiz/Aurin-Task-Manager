'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter
} from '../DialogPrimitives';
import { DialogFooter, DialogActions } from '../molecules';
import { DialogConfig } from '../../types/dialog.types';
import { panelVariants } from '../../config/animations';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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

  // Check if mobile for conditional rendering
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Map variant to submitVariant for DialogActions
  const getSubmitVariant = (): 'primary' | 'danger' | 'secondary' => {
    if (variant === 'danger') return 'danger';
    if (variant === 'warning') return 'secondary';
    return 'primary';
  };

  return (
    <ResponsiveDialog open={true} onOpenChange={(open) => !open && handleCancel()}>
      <ResponsiveDialogContent
        size={size}
        compact={true}
        closeOnOverlayClick={closeOnOverlayClick}
        closeOnEscape={closeOnEscape}
        showCloseButton={showCloseButton}
      >
        {isMobile ? (
          // Mobile: Use Drawer structure (no body needed for confirm dialogs)
          <>
            <ResponsiveDialogHeader>
              {title && <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>}
              {description && <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>}
            </ResponsiveDialogHeader>

            <ResponsiveDialogFooter>
              <DialogActions
                onCancel={handleCancel}
                onSubmit={handleConfirm}
                cancelText={cancelText}
                submitText={confirmText}
                isLoading={isLoading}
                submitVariant={getSubmitVariant()}
              />
            </ResponsiveDialogFooter>
          </>
        ) : (
          // Desktop: Use Dialog structure with DialogFooter from molecules
          <AnimatePresence mode="wait">
            <motion.div
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={styles.dialogInner}
              onKeyDown={handleKeyDown}
            >
              <ResponsiveDialogHeader>
                {title && <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>}
                {description && <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>}
              </ResponsiveDialogHeader>

              <DialogFooter>
                <DialogActions
                  onCancel={handleCancel}
                  onSubmit={handleConfirm}
                  cancelText={cancelText}
                  submitText={confirmText}
                  isLoading={isLoading}
                  submitVariant={getSubmitVariant()}
                />
              </DialogFooter>
            </motion.div>
          </AnimatePresence>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
