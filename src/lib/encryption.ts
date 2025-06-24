// Utilidades de cifrado para mensajes
// Utiliza AES-GCM para cifrado simétrico con autenticación

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recomendado para GCM

/**
 * Genera una clave de cifrado derivada del userId
 * En producción, esto debería usar una clave maestra más segura
 */
async function deriveUserKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(userId + process.env.NEXT_PUBLIC_ENCRYPTION_SALT || 'default-salt');
  
  // Usar PBKDF2 para derivar la clave
  const baseKey = await crypto.subtle.importKey('raw', keyData, 'PBKDF2', false, ['deriveBits']);
  
  const salt = encoder.encode('message-encryption-v1');
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_LENGTH
  );
  
  return crypto.subtle.importKey('raw', derivedBits, ALGORITHM, false, ['encrypt', 'decrypt']);
}

/**
 * Cifra un mensaje de texto
 */
export async function encryptMessage(plaintext: string, userId: string): Promise<string> {
  try {
    if (!plaintext || plaintext.trim() === '') {
      return plaintext; // No cifrar mensajes vacíos
    }

    const key = await deriveUserKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generar IV aleatorio
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Cifrar
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    // Combinar IV + datos cifrados y convertir a base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[Encryption] Error encrypting message:', error);
    // En caso de error, retornar el texto original para mantener funcionalidad
    return plaintext;
  }
}

/**
 * Descifra un mensaje
 */
export async function decryptMessage(encryptedData: string, userId: string): Promise<string> {
  try {
    if (!encryptedData || encryptedData.trim() === '') {
      return encryptedData;
    }

    // Verificar si el mensaje está cifrado (base64 válido y longitud mínima)
    if (!isEncryptedMessage(encryptedData)) {
      return encryptedData; // Retornar tal como está si no está cifrado
    }

    const key = await deriveUserKey(userId);
    
    // Decodificar de base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Separar IV y datos cifrados
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    // Descifrar
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[Encryption] Error decrypting message:', error);
    // En caso de error, retornar el texto cifrado para evitar pérdida de datos
    return encryptedData;
  }
}

/**
 * Verifica si un mensaje está cifrado basándose en su formato
 */
function isEncryptedMessage(text: string): boolean {
  if (!text || text.length < 20) return false;
  
  try {
    // Verificar si es base64 válido
    const decoded = atob(text);
    // Un mensaje cifrado debería tener al menos IV_LENGTH + algunos bytes de datos
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Cifra metadatos del archivo (nombre, tipo)
 */
export async function encryptFileMetadata(fileName: string, userId: string): Promise<string> {
  if (!fileName) return fileName;
  return encryptMessage(fileName, userId);
}

/**
 * Descifra metadatos del archivo
 */
export async function decryptFileMetadata(encryptedFileName: string, userId: string): Promise<string> {
  if (!encryptedFileName) return encryptedFileName;
  return decryptMessage(encryptedFileName, userId);
}

/**
 * Función helper para cifrar mensajes en lote (útil para migración)
 */
export async function encryptMessageBatch(messages: Array<{text: string, userId: string}>): Promise<Array<{originalText: string, encryptedText: string}>> {
  const results = [];
  
  for (const message of messages) {
    const encrypted = await encryptMessage(message.text, message.userId);
    results.push({
      originalText: message.text,
      encryptedText: encrypted
    });
  }
  
  return results;
}