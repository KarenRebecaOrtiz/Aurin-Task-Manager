'use server';

import { getAdminDb } from '@/lib/firebase-admin';

const ERROR_MESSAGES = {
  INVALID_TOKEN: 'Token inválido o no existe',
  TASK_NOT_SHARED: 'La tarea no está compartida públicamente',
  TEAM_NOT_SHARED: 'El equipo no está compartido públicamente',
  TOKEN_EXPIRED: 'El token ha expirado',
  SERVER_ERROR: 'Error del servidor. Por favor, intenta nuevamente.',
  REQUIRED_FIELDS: 'El token es requerido',
};

/**
 * Validate token for a specific task
 * Returns token data if valid, error otherwise
 */
export async function validateTokenForTask(taskId: string, token: string) {
  try {
    if (!token || !taskId) {
      return {
        success: false,
        error: ERROR_MESSAGES.REQUIRED_FIELDS,
      };
    }

    const adminDb = getAdminDb();

    // Get the task to ensure it's shared
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return {
        success: false,
        error: 'Tarea no encontrada',
      };
    }

    const taskData = taskDoc.data();

    // Verify task is shared
    if (!taskData?.shared) {
      return {
        success: false,
        error: ERROR_MESSAGES.TASK_NOT_SHARED,
      };
    }

    // Find the token in this task's shareTokens collection
    const tokensRef = taskRef.collection('shareTokens');
    const tokenQuery = await tokensRef.where('token', '==', token).limit(1).get();

    if (tokenQuery.empty) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_TOKEN,
      };
    }

    const tokenDoc = tokenQuery.docs[0];
    const tokenData = tokenDoc.data();

    // Check if token has expiration (legacy tokens)
    if (tokenData.expiresAt) {
      const now = new Date();
      const expiresAt = tokenData.expiresAt.toDate();

      if (now > expiresAt) {
        return {
          success: false,
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
        };
      }
    }

    // Return token data for client-side session management
    return {
      success: true,
      tokenData: {
        tokenId: tokenDoc.id,
        tokenName: tokenData.tokenName || null,
        guestName: tokenData.guestName || null,
        status: tokenData.status || 'pending',
        commentsEnabled: tokenData.commentsEnabled ?? true, // Default true for backwards compatibility
      },
    };
  } catch (error) {
    console.error('[validateTokenForTask] Error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}

/**
 * Validate token for a specific team
 * Returns token data if valid, error otherwise
 */
export async function validateTokenForTeam(teamId: string, token: string) {
  try {
    if (!token || !teamId) {
      return {
        success: false,
        error: ERROR_MESSAGES.REQUIRED_FIELDS,
      };
    }

    const adminDb = getAdminDb();

    // Get the team to ensure it's shared
    const teamRef = adminDb.collection('teams').doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return {
        success: false,
        error: 'Equipo no encontrado',
      };
    }

    const teamData = teamDoc.data();

    // Verify team is shared
    if (!teamData?.shared) {
      return {
        success: false,
        error: ERROR_MESSAGES.TEAM_NOT_SHARED,
      };
    }

    // Find the token in this team's shareTokens collection
    const tokensRef = teamRef.collection('shareTokens');
    const tokenQuery = await tokensRef.where('token', '==', token).limit(1).get();

    if (tokenQuery.empty) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_TOKEN,
      };
    }

    const tokenDoc = tokenQuery.docs[0];
    const tokenData = tokenDoc.data();

    // Check if token has expiration (legacy tokens)
    if (tokenData.expiresAt) {
      const now = new Date();
      const expiresAt = tokenData.expiresAt.toDate();

      if (now > expiresAt) {
        return {
          success: false,
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
        };
      }
    }

    // Return token data for client-side session management
    return {
      success: true,
      tokenData: {
        tokenId: tokenDoc.id,
        tokenName: tokenData.tokenName || null,
        guestName: tokenData.guestName || null,
        status: tokenData.status || 'pending',
        commentsEnabled: tokenData.commentsEnabled ?? true, // Default true for backwards compatibility
      },
    };
  } catch (error) {
    console.error('[validateTokenForTeam] Error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.SERVER_ERROR,
    };
  }
}
