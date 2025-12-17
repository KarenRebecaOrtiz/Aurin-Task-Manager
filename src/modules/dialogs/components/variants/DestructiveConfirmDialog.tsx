/**
 * Destructive Confirm Dialog
 * A confirmation dialog for dangerous/irreversible actions
 * Requires text confirmation before proceeding
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter
} from '../DialogPrimitives';
import { DialogFooter, DialogActions } from '../molecules';
import { panelVariants } from '../../config/animations';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from '../../styles/Dialog.module.scss';

export interface DestructiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  confirmationWord?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirmar Eliminación',
  description,
  itemName,
  warningMessage,
  confirmText = 'Confirmar Eliminación',
  cancelText = 'Cancelar',
  confirmationWord = 'Eliminar',
  onConfirm,
  onCancel,
  isLoading = false,
}: DestructiveConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const loading = isLoading || internalLoading;
  const isConfirmDisabled = inputValue !== confirmationWord || loading;

  const handleConfirm = useCallback(async () => {
    if (isConfirmDisabled) return;

    setInternalLoading(true);
    try {
      await onConfirm();
      setInputValue('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error in destructive action:', error);
    } finally {
      setInternalLoading(false);
    }
  }, [isConfirmDisabled, onConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    setInputValue('');
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConfirmDisabled) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // Reset input when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('');
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const renderContent = () => (
    <>
      {/* Warning Header */}
      <div className={styles.destructiveHeader}>
        <AlertTriangle className={styles.destructiveIcon} size={24} />
        <div className={styles.destructiveHeaderText}>
          <ResponsiveDialogTitle className={styles.destructiveTitle}>
            {title}
          </ResponsiveDialogTitle>
          {description && (
            <ResponsiveDialogDescription className={styles.destructiveDescription}>
              {description}
            </ResponsiveDialogDescription>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.destructiveContent}>
        <p className={styles.destructiveWarningText}>
          Esta acción no se puede deshacer.
        </p>

        {itemName && (
          <p className={styles.destructiveItemText}>
            Al eliminar <strong>&ldquo;{itemName}&rdquo;</strong>, los elementos asociados
            no serán eliminados, pero deberán ser reasignados manualmente.
          </p>
        )}

        {warningMessage && (
          <div className={styles.destructiveNote}>
            <AlertTriangle size={16} className={styles.destructiveNoteIcon} />
            <span>{warningMessage}</span>
          </div>
        )}

        {/* Confirmation Input */}
        <div className={styles.destructiveInputWrapper}>
          <label className={styles.destructiveInputLabel}>
            Escribe <strong>&ldquo;{confirmationWord}&rdquo;</strong> para confirmar:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmationWord}
            autoFocus
            disabled={loading}
            onKeyDown={handleKeyDown}
            className={styles.destructiveInput}
          />
        </div>
      </div>
    </>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent
        size="sm"
        compact={true}
        closeOnOverlayClick={!loading}
        closeOnEscape={!loading}
        showCloseButton={false}
        className={styles.destructiveDialog}
      >
        {isMobile ? (
          <>
            <ResponsiveDialogHeader className={styles.destructiveHeaderMobile}>
              {renderContent()}
            </ResponsiveDialogHeader>

            <ResponsiveDialogFooter>
              <DialogActions
                onCancel={handleCancel}
                onSubmit={handleConfirm}
                cancelText={cancelText}
                submitText={confirmText}
                isLoading={loading}
                submitVariant="danger"
                submitDisabled={isConfirmDisabled}
                cancelDisabled={loading}
              />
            </ResponsiveDialogFooter>
          </>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={styles.dialogInner}
            >
              <ResponsiveDialogHeader className={styles.destructiveHeaderDesktop}>
                {renderContent()}
              </ResponsiveDialogHeader>

              <DialogFooter className={styles.destructiveFooter}>
                <DialogActions
                  onCancel={handleCancel}
                  onSubmit={handleConfirm}
                  cancelText={cancelText}
                  submitText={confirmText}
                  isLoading={loading}
                  submitVariant="danger"
                  submitDisabled={isConfirmDisabled}
                  cancelDisabled={loading}
                />
              </DialogFooter>
            </motion.div>
          </AnimatePresence>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
