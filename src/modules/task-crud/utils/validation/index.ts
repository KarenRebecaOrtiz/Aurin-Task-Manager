/**
 * Validation Utilities for Task CRUD
 * Form validation helpers and error messages
 */

import { sileo } from 'sileo';

// Validate task dates
export const validateTaskDates = (startDate: Date | null, endDate: Date | null): boolean => {
  if (!startDate || !endDate) return true;

  if (startDate > endDate) {
    sileo.error({
      title: 'Fechas inválidas',
      description: 'La fecha de inicio debe ser anterior a la de fin.',
    });
    return false;
  }

  return true;
};

// Show required fields error
export const showRequiredFieldsError = (): void => {
  sileo.error({
    title: 'Campos incompletos',
    description: 'Completa los campos marcados en rojo para continuar.',
  });
};

// Get user-friendly error message
export const getUserFriendlyErrorMessage = (errorMessage: string): { title: string; description: string } => {
  if (errorMessage.includes('permission')) {
    return {
      title: 'Sin permisos',
      description: 'Contacta a tu administrador para acceder.',
    };
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      title: 'Sin conexión',
      description: 'Revisa tu conexión a internet e intenta de nuevo.',
    };
  }

  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return {
      title: 'Límite alcanzado',
      description: 'Contacta a tu administrador para aumentar el límite.',
    };
  }

  if (errorMessage.includes('validation') || errorMessage.includes('required')) {
    return {
      title: 'Datos incompletos',
      description: 'Revisa el formulario y completa la información requerida.',
    };
  }

  if (errorMessage.includes('timeout')) {
    return {
      title: 'Tiempo agotado',
      description: 'La conexión es lenta. Intenta de nuevo.',
    };
  }

  if (errorMessage.includes('not-found') || errorMessage.includes('does not exist')) {
    return {
      title: 'Tarea no encontrada',
      description: 'Fue eliminada o ya no existe.',
    };
  }

  return {
    title: 'Algo salió mal',
    description: 'Intenta de nuevo. Si persiste, contacta soporte.',
  };
};
