/**
 * Client Dialog Actions Component
 * Footer actions for the client dialog
 */

'use client';

import { Button } from '@/components/ui/buttons';

interface ClientDialogActionsProps {
  mode: 'create' | 'view' | 'edit';
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
}

export function ClientDialogActions({
  mode,
  isSubmitting,
  onCancel,
  onSubmit,
  onEdit,
  onCancelEdit,
  onClose,
}: ClientDialogActionsProps) {
  return (
    <div className="flex justify-end gap-4">
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
          <Button
            type="button"
            intent="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? 'Actualizando...' : 'Actualizar Cliente'}
          </Button>
        </>
      ) : (
        <>
          <Button type="button" intent="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            intent="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </>
      )}
    </div>
  );
}
