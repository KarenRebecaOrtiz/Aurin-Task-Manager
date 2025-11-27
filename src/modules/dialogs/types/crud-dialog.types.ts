import { ReactNode } from 'react';
import { DialogSize } from './dialog.types';

export type CrudDialogMode = 'create' | 'view' | 'edit';

export interface CrudDialogProps {
  // State
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CrudDialogMode;

  // Content
  title?: string;
  description?: string;
  children: ReactNode;

  // Loading & Error states
  isLoading?: boolean;
  isSubmitting?: boolean;
  error?: Error | string;
  loadingMessage?: string;

  // Actions
  onSubmit?: () => void | Promise<void>;
  onCancel?: () => void;
  onEdit?: () => void;
  onClose?: () => void;

  // Configuration
  size?: DialogSize;
  submitText?: string;
  cancelText?: string;
  editText?: string;
  submitVariant?: 'primary' | 'danger' | 'secondary';

  // Custom overrides
  header?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  loadingState?: ReactNode;
  errorState?: ReactNode;

  // Behavior
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;

  // Additional props
  className?: string;
}
