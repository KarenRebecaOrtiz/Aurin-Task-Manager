'use client';

import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';

/**
 * Hook para migrar de SuccessAlert/FailAlert a Sonner
 * Proporciona una interfaz compatible con el sistema anterior
 */
export function useAlertMigration() {
  const { success, error } = useSonnerToast();

  // Función compatible con showSuccess del store
  const showSuccess = (message: string) => {
    success(message, { duration: 3000 });
  };

  // Función compatible con showFail del store
  const showFail = (message: string, errorDetails?: string) => {
    error(message, errorDetails, { duration: 5000 });
  };

  return {
    showSuccess,
    showFail,
    // Aliases para compatibilidad
    success: showSuccess,
    fail: showFail,
    error: showFail,
  };
}
