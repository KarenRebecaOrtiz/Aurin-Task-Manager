/**
 * Validation Utilities for Task CRUD
 * Form validation helpers and error messages
 */

import { toast } from '@/components/ui/use-toast';

// Validate task dates
export const validateTaskDates = (startDate: Date | null, endDate: Date | null): boolean => {
  if (!startDate || !endDate) return true;

  if (startDate > endDate) {
    toast({
      title: '⚠️ Error en las Fechas',
      description: 'La fecha de inicio debe ser anterior a la fecha de finalización. Por favor, verifica las fechas seleccionadas.',
      variant: 'error',
    });
    return false;
  }

  return true;
};

// Show required fields error
export const showRequiredFieldsError = (): void => {
  toast({
    title: '⚠️ Campos Requeridos',
    description: 'Hay algunos campos obligatorios que necesitan ser completados. Revisa los campos marcados en rojo y completa la información faltante.',
    variant: 'error',
  });
};

// Get user-friendly error message
export const getUserFriendlyErrorMessage = (errorMessage: string): { title: string; description: string } => {
  if (errorMessage.includes('permission')) {
    return {
      title: '🔒 Sin Permisos',
      description: 'No tienes permisos para realizar esta acción. Contacta a tu administrador para obtener los permisos necesarios.',
    };
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      title: '🌐 Problema de Conexión',
      description: 'Hay un problema con tu conexión a internet. Verifica tu conexión e intenta nuevamente.',
    };
  }

  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return {
      title: '⚠️ Límite Alcanzado',
      description: 'Se ha alcanzado el límite de tareas permitidas. Contacta a tu administrador para aumentar el límite.',
    };
  }

  if (errorMessage.includes('validation') || errorMessage.includes('required')) {
    return {
      title: '⚠️ Datos Incompletos',
      description: 'Algunos campos obligatorios están incompletos o contienen errores. Revisa el formulario y completa toda la información requerida.',
    };
  }

  if (errorMessage.includes('timeout')) {
    return {
      title: '⏱️ Tiempo de Espera Agotado',
      description: 'La operación tardó demasiado en completarse. Tu conexión puede ser lenta, intenta nuevamente.',
    };
  }

  if (errorMessage.includes('not-found') || errorMessage.includes('does not exist')) {
    return {
      title: '🔍 Tarea No Encontrada',
      description: 'La tarea que intentas editar ya no existe o fue eliminada por otro usuario.',
    };
  }

  return {
    title: '❌ Error',
    description: 'No pudimos completar la operación. Por favor, verifica todos los campos e intenta nuevamente. Si el problema persiste, contacta al soporte técnico.',
  };
};
