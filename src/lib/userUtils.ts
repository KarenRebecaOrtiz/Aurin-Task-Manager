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
 * @returns Array de objetos con userId, email y nombres
 */
export async function getUserEmails(userIds: string[]): Promise<Array<{ 
  userId: string; 
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
}>> {
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
      // Asegurar que todos los campos estén presentes
      return result.data.map(user => ({
        userId: user.userId,
        email: user.email || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        fullName: user.fullName || null,
      }));
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('[userUtils] Error retrieving user emails:', error);
    // Retornar array con campos null en caso de error
    return userIds.map(userId => ({ 
      userId, 
      email: null,
      firstName: null,
      lastName: null,
      fullName: null
    }));
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
    // Usar la nueva API que incluye nombres
    const userInfo = await getUserEmails([userId]);
    
    if (userInfo.length > 0) {
      const user = userInfo[0];
      return {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`[userUtils] Error retrieving basic info for user ${userId}:`, error);
    return null;
  }
}

/**
 * Función utilitaria para obtener emails de usuarios (versión sin hooks)
 * @param userIds - Array de IDs de usuarios
 * @returns Promise con array de objetos con userId y email
 */
export async function getUserEmailsAsync(userIds: string[]): Promise<{ 
  emails: Array<{ 
    userId: string; 
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
  }>;
  loading: boolean;
  error: string | null;
}> {
  if (userIds.length === 0) {
    return { emails: [], loading: false, error: null };
  }

  try {
    const result = await getUserEmails(userIds);
    return { emails: result, loading: false, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[getUserEmailsAsync] Error:', err);
    return { emails: [], loading: false, error: errorMessage };
  }
}
