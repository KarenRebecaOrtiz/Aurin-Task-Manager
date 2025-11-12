/**
 * useToast Hook - API principal para mostrar toasts
 * Hook personalizado para usar en cualquier componente
 */

import { useCallback } from 'react';
import { useToastStore } from '../store/toastStore';
import { ToastVariant } from '../types';

interface UseToastOptions {
  duration?: number;
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  playSound?: boolean;
}

export const useToast = () => {
  const { addToast, removeToast, clearAll } = useToastStore();

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = 'info',
      options?: UseToastOptions
    ) => {
      return addToast({
        message,
        variant,
        duration: options?.duration ?? 5000,
        onClose: options?.onClose,
        onAction: options?.onAction,
        actionLabel: options?.actionLabel,
        playSound: options?.playSound ?? true,
      });
    },
    [addToast]
  );

  const success = useCallback(
    (message: string, options?: UseToastOptions) => {
      return showToast(message, 'success', options);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, errorDetails?: string, options?: UseToastOptions) => {
      return addToast({
        message,
        variant: 'error',
        error: errorDetails,
        duration: options?.duration ?? 5000,
        onClose: options?.onClose,
        onAction: options?.onAction,
        actionLabel: options?.actionLabel,
        playSound: options?.playSound ?? true,
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: UseToastOptions) => {
      return showToast(message, 'warning', options);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: UseToastOptions) => {
      return showToast(message, 'info', options);
    },
    [showToast]
  );

  return {
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
    clearAll,
  };
};
