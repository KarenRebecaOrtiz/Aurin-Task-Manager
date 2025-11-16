import { ReactNode } from 'react';

// Sizes
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Variants
export type DialogVariant = 'default' | 'danger' | 'warning' | 'success' | 'info';

// Base dialog configuration
export interface DialogConfig {
  id: string;
  type: 'confirm' | 'alert' | 'form' | 'custom';
  title?: string;
  description?: string;
  content?: ReactNode;
  size?: DialogSize;
  variant?: DialogVariant;

  // Behavior
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;

  // Callbacks
  onClose?: () => void;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;

  // Confirm specific
  confirmText?: string;
  cancelText?: string;

  // Alert specific
  autoClose?: boolean;
  autoCloseDelay?: number;

  // Form specific
  formContent?: ReactNode;
  submitText?: string;
  onSubmit?: (data: unknown) => void | Promise<void>;

  // State
  isLoading?: boolean;
}

// Store state
export interface DialogStore {
  dialogs: DialogConfig[];
  open: (config: Omit<DialogConfig, 'id'>) => string;
  close: (id: string) => void;
  closeAll: () => void;
  update: (id: string, updates: Partial<DialogConfig>) => void;
}

// Hook return type
export interface UseDialogReturn {
  openConfirm: (config: ConfirmDialogOptions) => string;
  openAlert: (config: AlertDialogOptions) => string;
  openForm: (config: FormDialogOptions) => string;
  openCustom: (config: CustomDialogOptions) => string;
  close: (id: string) => void;
  closeAll: () => void;
}

// Simplified options for each dialog type
export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  variant?: DialogVariant;
  size?: DialogSize;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertDialogOptions {
  title: string;
  description?: string;
  variant?: DialogVariant;
  size?: DialogSize;
  confirmText?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  onConfirm?: () => void;
}

export interface FormDialogOptions {
  title: string;
  description?: string;
  size?: DialogSize;
  formContent: ReactNode;
  submitText?: string;
  cancelText?: string;
  onSubmit: (data: unknown) => void | Promise<void>;
  onCancel?: () => void;
}

export interface CustomDialogOptions {
  title?: string;
  description?: string;
  content: ReactNode;
  size?: DialogSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
}

// Component props
export interface DialogBaseProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: DialogSize;
  variant?: DialogVariant;
  children?: ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}
