'use client';

import { useState, useCallback } from 'react';
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
import styles from '../../styles/Dialog.module.scss';

interface FormDialogProps {
  config: DialogConfig;
  onClose: () => void;
}

export function FormDialog({ config, onClose }: FormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    title,
    description,
    size,
    formContent,
    submitText = 'Enviar',
    cancelText = 'Cancelar',
    onSubmit,
    onCancel,
    closeOnOverlayClick,
    closeOnEscape,
    showCloseButton,
  } = config;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onSubmit) return;

      setIsLoading(true);
      try {
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());
        await onSubmit(data);
        onClose();
      } catch (error) {
        console.error('Error in form submission:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [onSubmit, onClose]
  );

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  }, [onCancel, onClose]);

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

        <form onSubmit={handleSubmit} className={styles.formContent}>
          <ResponsiveDialogBody>
            <div className={styles.formBody}>{formContent}</div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.cancelButton}
                disabled={isLoading}
              >
                {cancelText}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={styles.confirmButton}
              >
                {isLoading ? 'Procesando...' : submitText}
              </button>
            </div>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
