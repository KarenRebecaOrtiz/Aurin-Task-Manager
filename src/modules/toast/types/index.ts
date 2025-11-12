/**
 * Toast Types - Sistema centralizado de notificaciones
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';

export interface ToastConfig {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  position?: ToastPosition;
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  playSound?: boolean;
  error?: string; // Para toasts de error, detalles adicionales
}

export interface ToastContextType {
  toasts: ToastConfig[];
  addToast: (config: Omit<ToastConfig, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}
