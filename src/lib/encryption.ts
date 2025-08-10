import { Message } from '@/types';

// Función para decrypt un mensaje individual usando Web Crypto API
export const decryptMessage = async (encryptedText: string, key: string): Promise<string> => {
  try {
    if (!encryptedText || encryptedText.startsWith('decrypted:')) {
      return encryptedText.replace('decrypted:', '');
    }

    // Check if base64 valid before atob
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(encryptedText) && encryptedText.length % 4 === 0;
    if (!isBase64) {
      console.warn('[Encryption] Invalid base64, fallback to plain text');
      return encryptedText;
    }

    // Convierte key a CryptoKey usando PBKDF2
    const encoder = new TextEncoder();
    const salt = encoder.encode('aurin-salt-2024'); // Salt único por aplicación
    const keyMaterial = await crypto.subtle.importKey(
      'raw', 
      encoder.encode(key), 
      'PBKDF2', 
      false, 
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      { 
        name: 'PBKDF2', 
        salt, 
        iterations: 100000, 
        hash: 'SHA-256' 
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Asume encryptedText es base64 con IV prefixed (12 bytes IV)
    const data = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[Encryption] Error decrypting message:', error);
    return encryptedText; // Fallback al texto original
  }
};

// Función para decrypt un batch de mensajes (optimizada para performance)
export const decryptBatch = async (
  messages: Message[], 
  batchSize: number = 20, // Aumentado de 5 a 20 para mejor performance
  taskId: string
): Promise<Message[]> => {
  try {
    // Limitar el batch para evitar problemas de performance
    const limitedMessages = messages.slice(0, batchSize);
    
    // Procesar en batches paralelos para mejor performance
    const batchSizeParallel = 5; // Procesar 5 mensajes en paralelo
    const decryptedMessages: Message[] = [];
    
    for (let i = 0; i < limitedMessages.length; i += batchSizeParallel) {
      const batch = limitedMessages.slice(i, i + batchSizeParallel);
      const batchResults = await Promise.all(
        batch.map(async (msg) => {
          if (!msg.text) return msg;
          
          const decryptedText = await decryptMessage(msg.text, taskId);
          return {
            ...msg,
            text: decryptedText,
          };
        })
      );
      decryptedMessages.push(...batchResults);
    }
    
    console.log(`[Encryption] Decrypted ${decryptedMessages.length} messages for task ${taskId} in parallel batches`);
    return decryptedMessages;
  } catch (error) {
    console.error('[Encryption] Error in decryptBatch:', error);
    // Fallback: retornar mensajes originales
    return messages.slice(0, batchSize);
  }
};
