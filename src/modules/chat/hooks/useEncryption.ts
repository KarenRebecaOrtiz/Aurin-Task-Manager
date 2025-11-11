/**
 * useEncryption Hook
 * 
 * Hook para encriptar y desencriptar mensajes del chat.
 * Reutiliza la lógica del hook global pero con tipos del módulo.
 */

import { useEncryption as useGlobalEncryption } from '@/hooks/useEncryption';

/**
 * Hook de encriptación para el módulo de chat
 * Wrapper del hook global para mantener consistencia
 */
export const useEncryption = (taskId: string) => {
  return useGlobalEncryption(taskId);
};
