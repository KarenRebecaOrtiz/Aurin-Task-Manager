import { useState, useEffect } from 'react';

/**
 * Utilidades para obtener datos de usuarios desde el cliente
 * Usa la API route /api/user-emails para obtener emails
 */

/**
 * Obtiene el email de un usuario específico desde la API
 * @param userId - ID del usuario
 * @returns Email del usuario o null si no se encuentra
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/user-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userIds: [userId] }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      const user = result.data[0];
      if (user.email) {
        console.log(`[userUtils] Retrieved email for user ${userId}: ${user.email}`);
        return user.email;
      }
    }
    
    console.warn(`[userUtils] No email found for user ${userId}`);
    return null;
  } catch (error) {
    console.error(`[userUtils] Error retrieving email for user ${userId}:`, error);
    return null;
  }
}

/**
 * Obtiene emails de múltiples usuarios desde la API
 * @param userIds - Array de IDs de usuarios
 * @returns Array de objetos con userId y email
 */
export async function getUserEmails(userIds: string[]): Promise<Array<{ userId: string; email: string | null }>> {
  try {
    if (userIds.length === 0) {
      return [];
    }

    const response = await fetch('/api/user-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userIds }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`[userUtils] Retrieved emails for ${result.validCount}/${result.totalCount} users`);
      return result.data;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('[userUtils] Error retrieving user emails:', error);
    // Retornar array con emails null en caso de error
    return userIds.map(userId => ({ userId, email: null }));
  }
}

/**
 * Obtiene información básica de un usuario desde la API
 * @param userId - ID del usuario
 * @returns Información básica del usuario o null si no se encuentra
 */
export async function getUserBasicInfo(userId: string): Promise<{ 
  email: string | null; 
  firstName: string | null; 
  lastName: string | null; 
  fullName: string | null; 
} | null> {
  try {
    // Por ahora solo obtenemos email, pero podríamos extender la API
    const email = await getUserEmail(userId);
    
    if (email) {
      return {
        email,
        firstName: null, // TODO: Extender API para incluir más información
        lastName: null,
        fullName: null,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`[userUtils] Error retrieving basic info for user ${userId}:`, error);
    return null;
  }
}

/**
 * Hook para obtener emails de usuarios con cache
 * @param userIds - Array de IDs de usuarios
 * @returns Array de objetos con userId y email
 */
export function useUserEmails(userIds: string[]) {
  const [emails, setEmails] = useState<Array<{ userId: string; email: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userIds.length === 0) {
      setEmails([]);
      return;
    }

    const fetchEmails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await getUserEmails(userIds);
        setEmails(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('[useUserEmails] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [userIds.join(',')]); // Dependencia basada en userIds

  return { emails, loading, error };
}
