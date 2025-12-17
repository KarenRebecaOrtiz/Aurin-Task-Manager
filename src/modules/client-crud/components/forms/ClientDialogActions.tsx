/**
 * Client Dialog Actions Component
 * Footer actions for the client dialog
 */

'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/buttons';

interface ClientDialogActionsProps {
  mode: 'create' | 'view' | 'edit';
  isSubmitting: boolean;
  isDeleting?: boolean;
  isAdmin?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

export function ClientDialogActions({
  mode,
  isSubmitting,
  isDeleting = false,
  isAdmin = false,
  onCancel,
  onSubmit,
  onEdit,
  onCancelEdit,
  onClose,
  onDelete,
}: ClientDialogActionsProps) {
  const isDisabled = isSubmitting || isDeleting;

  return (
    <div className="flex justify-between gap-4">
      {/* Delete button - only for admins in edit mode */}
      {mode === 'edit' && isAdmin && onDelete && (
        <Button
          type="button"
          intent="outline"
          onClick={onDelete}
          disabled={isDisabled}
          className="text-red-500 border-red-500 hover:bg-red-50 flex items-center gap-2"
        >
          <Trash2 size={16} />
          Eliminar
        </Button>
      )}

      <div className="flex justify-end gap-4 ml-auto">
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
            <Button type="button" intent="outline" onClick={onCancelEdit} disabled={isDisabled}>
              Cancelar
            </Button>
            <Button
              type="button"
              intent="primary"
              isLoading={isSubmitting}
              disabled={isDisabled}
              onClick={onSubmit}
            >
              {isSubmitting ? 'Actualizando...' : 'Actualizar Cliente'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" intent="outline" onClick={onCancel} disabled={isDisabled}>
              Cancelar
            </Button>
            <Button
              type="button"
              intent="primary"
              isLoading={isSubmitting}
              disabled={isDisabled}
              onClick={onSubmit}
            >
              {isSubmitting ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
