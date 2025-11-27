'use client';

import { Button } from '@/components/ui/buttons';
import { cn } from '@/lib/utils';

export interface DialogActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  cancelText?: string;
  submitText?: string;
  isLoading?: boolean;
  submitVariant?: 'primary' | 'danger' | 'secondary';
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export function DialogActions({
  onCancel,
  onSubmit,
  cancelText = 'Cancelar',
  submitText = 'Guardar',
  isLoading = false,
  submitVariant = 'primary',
  submitDisabled = false,
  cancelDisabled = false,
  layout = 'horizontal',
  className,
}: DialogActionsProps) {
  const containerClasses = cn(
    'flex gap-3',
    layout === 'horizontal' ? 'flex-row justify-end' : 'flex-col',
    className
  );

  return (
    <div className={containerClasses}>
      {onCancel && (
        <Button
          type="button"
          onClick={onCancel}
          intent="ghost"
          size="md"
          disabled={cancelDisabled || isLoading}
        >
          {cancelText}
        </Button>
      )}
      {onSubmit && (
        <Button
          type={typeof onSubmit === 'function' ? "button" : "submit"}
          onClick={typeof onSubmit === 'function' ? onSubmit : undefined}
          intent={submitVariant}
          size="md"
          isLoading={isLoading}
          disabled={submitDisabled}
          loadingText="Procesando..."
        >
          {submitText}
        </Button>
      )}
      {!onSubmit && submitText && (
        <Button
          type="submit"
          intent={submitVariant}
          size="md"
          isLoading={isLoading}
          disabled={submitDisabled}
          loadingText="Procesando..."
        >
          {submitText}
        </Button>
      )}
    </div>
  );
}
