// src/hooks/useEncryption.ts
import { useCallback } from 'react';

// Configuraciones
const PBKDF2_ITERATIONS = 100000; // Ajusta si es lento
const SALT_LENGTH = 16; // Bytes
const NONCE_LENGTH = 12; // Bytes para AES-GCM
const KEY_LENGTH = 256; // Bits para AES-256

export const useEncryption = (uniqueSecret: string) => {
  // Genera sal aleatoria
  const generateSalt = useCallback((): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }, []);

  // Deriva clave con PBKDF2
  const deriveKey = useCallback(async (secret: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }, []);

  // Encripta texto
  const encryptMessage = useCallback(async (text: string): Promise<{ encryptedData: string; nonce: string; tag: string; salt: string }> => {
    // Si uniqueSecret está vacío, devolver valores por defecto
    if (!uniqueSecret || uniqueSecret === '') {
      console.warn('[useEncryption] Cannot encrypt: uniqueSecret is empty');
      return { encryptedData: '', nonce: '', tag: '', salt: '' };
    }
    
    const salt = generateSalt();
    const key = await deriveKey(uniqueSecret, salt);
    const encoder = new TextEncoder();
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
    const encodedText = encoder.encode(text);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      encodedText
    );

    const encryptedArray = new Uint8Array(encrypted);
    const tagLength = 16; // Tag AES-GCM
    const ciphertext = encryptedArray.slice(0, -tagLength);
    const tag = encryptedArray.slice(-tagLength);

    return {
      encryptedData: btoa(String.fromCharCode(...ciphertext)),
      nonce: btoa(String.fromCharCode(...nonce)),
      tag: btoa(String.fromCharCode(...tag)),
      salt: btoa(String.fromCharCode(...salt)),
    };
  }, [uniqueSecret, deriveKey, generateSalt]);

  // Desencripta
  const decryptMessage = useCallback(async (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string }): Promise<string> => {
    // Si uniqueSecret está vacío, devolver cadena vacía
    if (!uniqueSecret || uniqueSecret === '') {
      console.warn('[useEncryption] Cannot decrypt: uniqueSecret is empty');
      return '';
    }
    
    const saltArray = Uint8Array.from(atob(encrypted.salt), (c) => c.charCodeAt(0));
    const key = await deriveKey(uniqueSecret, saltArray);
    const nonceArray = Uint8Array.from(atob(encrypted.nonce), (c) => c.charCodeAt(0));
    const ciphertextArray = Uint8Array.from(atob(encrypted.encryptedData), (c) => c.charCodeAt(0));
    const tagArray = Uint8Array.from(atob(encrypted.tag), (c) => c.charCodeAt(0));

    const encryptedWithTag = new Uint8Array(ciphertextArray.length + tagArray.length);
    encryptedWithTag.set(ciphertextArray);
    encryptedWithTag.set(tagArray, ciphertextArray.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonceArray },
      key,
      encryptedWithTag
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }, [uniqueSecret, deriveKey]);

  return { encryptMessage, decryptMessage };
};