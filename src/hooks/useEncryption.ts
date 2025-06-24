import { useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { encryptMessage, decryptMessage, encryptFileMetadata, decryptFileMetadata } from '@/lib/encryption';

interface UseEncryptionResult {
  encryptText: (text: string) => Promise<string>;
  decryptText: (encryptedText: string) => Promise<string>;
  encryptFileName: (fileName: string) => Promise<string>;
  decryptFileName: (encryptedFileName: string) => Promise<string>;
  isEncryptionReady: boolean;
}

/**
 * Hook personalizado para manejar el cifrado/descifrado de mensajes
 * Utiliza el userId del usuario autenticado como base para las claves
 */
export function useEncryption(): UseEncryptionResult {
  const { user } = useUser();
  
  const userId = user?.id;
  const isEncryptionReady = Boolean(userId);

  const encryptText = useCallback(async (text: string): Promise<string> => {
    if (!userId || !text) return text;
    
    try {
      return await encryptMessage(text, userId);
    } catch (error) {
      console.error('[useEncryption] Error encrypting text:', error);
      return text; // Fallback al texto original
    }
  }, [userId]);

  const decryptText = useCallback(async (encryptedText: string): Promise<string> => {
    if (!userId || !encryptedText) return encryptedText;
    
    try {
      return await decryptMessage(encryptedText, userId);
    } catch (error) {
      console.error('[useEncryption] Error decrypting text:', error);
      return encryptedText; // Fallback al texto cifrado
    }
  }, [userId]);

  const encryptFileName = useCallback(async (fileName: string): Promise<string> => {
    if (!userId || !fileName) return fileName;
    
    try {
      return await encryptFileMetadata(fileName, userId);
    } catch (error) {
      console.error('[useEncryption] Error encrypting filename:', error);
      return fileName;
    }
  }, [userId]);

  const decryptFileName = useCallback(async (encryptedFileName: string): Promise<string> => {
    if (!userId || !encryptedFileName) return encryptedFileName;
    
    try {
      return await decryptFileMetadata(encryptedFileName, userId);
    } catch (error) {
      console.error('[useEncryption] Error decrypting filename:', error);
      return encryptedFileName;
    }
  }, [userId]);

  return useMemo(() => ({
    encryptText,
    decryptText,
    encryptFileName,
    decryptFileName,
    isEncryptionReady,
  }), [encryptText, decryptText, encryptFileName, decryptFileName, isEncryptionReady]);
}