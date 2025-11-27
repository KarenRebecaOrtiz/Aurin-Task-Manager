import { useCallback } from 'react';
import { useDialogStore } from '../stores/dialogStore';
import {
  UseDialogReturn,
  ConfirmDialogOptions,
  AlertDialogOptions,
  FormDialogOptions,
  CustomDialogOptions,
} from '../types/dialog.types';

export function useDialog(): UseDialogReturn {
  const open = useDialogStore((state) => state.open);
  const close = useDialogStore((state) => state.close);
  const closeAll = useDialogStore((state) => state.closeAll);

  const openConfirm = useCallback(
    (options: ConfirmDialogOptions): string => {
      return open({
        type: 'confirm',
        title: options.title,
        description: options.description,
        variant: options.variant || 'default',
        size: options.size || 'sm',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    },
    [open]
  );

  const openAlert = useCallback(
    (options: AlertDialogOptions): string => {
      return open({
        type: 'alert',
        title: options.title,
        description: options.description,
        variant: options.variant || 'info',
        size: options.size || 'sm',
        confirmText: options.confirmText,
        autoClose: options.autoClose,
        autoCloseDelay: options.autoCloseDelay,
        onConfirm: options.onConfirm,
      });
    },
    [open]
  );

  const openForm = useCallback(
    (options: FormDialogOptions): string => {
      return open({
        type: 'form',
        title: options.title,
        description: options.description,
        size: options.size || 'md',
        formContent: options.formContent,
        submitText: options.submitText,
        cancelText: options.cancelText,
        onSubmit: options.onSubmit,
        onCancel: options.onCancel,
      });
    },
    [open]
  );

  const openCustom = useCallback(
    (options: CustomDialogOptions): string => {
      return open({
        type: 'custom',
        title: options.title,
        description: options.description,
        content: options.content,
        size: options.size || 'md',
        closeOnOverlayClick: options.closeOnOverlayClick,
        closeOnEscape: options.closeOnEscape,
        showCloseButton: options.showCloseButton,
        onClose: options.onClose,
      });
    },
    [open]
  );

  return {
    openConfirm,
    openAlert,
    openForm,
    openCustom,
    close,
    closeAll,
  };
}
