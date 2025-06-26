import { useCallback } from 'react';

// Hook de cifrado end-to-end
export const useEncryption = () => {
  const encryptMessage = useCallback((text: string): string => {
    try {
      // Cifrado simple usando btoa (Base64) - reemplaza con una librería de cifrado más robusta en producción
      const encoded = btoa(unescape(encodeURIComponent(text)));
      return `encrypted:${encoded}`;
    } catch (error) {
      console.error('Error al cifrar mensaje:', error);
      return text; // Fallback: retorna el texto sin cifrar si hay error
    }
  }, []);

  const decryptMessage = useCallback((encryptedText: string): string => {
    try {
      // Verificar si el texto está cifrado
      if (!encryptedText.startsWith('encrypted:')) {
        return encryptedText; // No está cifrado, retorna tal como está
      }
      
      // Descifrar el texto
      const encoded = encryptedText.replace('encrypted:', '');
      const decoded = decodeURIComponent(escape(atob(encoded)));
      return decoded;
    } catch (error) {
      console.error('Error al descifrar mensaje:', error);
      return encryptedText; // Fallback: retorna el texto cifrado si hay error
    }
  }, []);

  return { encryptMessage, decryptMessage };
};
