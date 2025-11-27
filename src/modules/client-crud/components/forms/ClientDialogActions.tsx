/**
 * Client Dialog Actions Component
 * Footer actions for the client dialog (navigation, save, cancel, etc.)
 */

'use client';

import { Button } from '@/components/ui/buttons';

interface ClientDialogActionsProps {
  mode: 'create' | 'view' | 'edit';
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
}

export function ClientDialogActions({
  mode,
  currentStep,
  totalSteps,
  isSubmitting,
  onBack,
  onNext,
  onCancel,
  onSubmit,
  onEdit,
  onCancelEdit,
  onClose,
}: ClientDialogActionsProps) {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const isReadOnly = mode === 'view';

  return (
    <div className="flex justify-between gap-4 px-6 pb-6 border-t border-gray-200 pt-4">
      {/* Left side - Back button */}
      {!isReadOnly && !isFirstStep ? (
        <Button type="button" intent="outline" onClick={onBack} disabled={isSubmitting}>
          Atrás
        </Button>
      ) : (
        <div />
      )}

      {/* Right side - Action buttons */}
      <div className="flex gap-4">
        {mode === 'view' ? (
          <>
            <Button type="button" intent="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" intent="primary" onClick={onEdit}>
              Editar
            </Button>
          </>
        ) : mode === 'edit' ? (
          <>
            <Button type="button" intent="outline" onClick={onCancelEdit} disabled={isSubmitting}>
              Cancelar
            </Button>
            {isLastStep ? (
              <Button
                type="button"
                intent="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                onClick={onSubmit}
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar Cliente'}
              </Button>
            ) : (
              <Button type="button" intent="primary" onClick={onNext} disabled={isSubmitting}>
                Siguiente
              </Button>
            )}
          </>
        ) : (
          <>
            <Button type="button" intent="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            {isLastStep ? (
              <Button
                type="button"
                intent="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                onClick={onSubmit}
              >
                {isSubmitting ? 'Creando...' : 'Crear Cliente'}
              </Button>
            ) : (
              <Button type="button" intent="primary" onClick={onNext} disabled={isSubmitting}>
                Siguiente
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
