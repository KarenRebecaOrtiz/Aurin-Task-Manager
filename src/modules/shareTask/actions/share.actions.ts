// src/modules/shareTask/actions/share.actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import {
  enableTaskSharing,
  disableTaskSharing,
  updateCommentsEnabled,
  getShareInfo,
} from '../services/shareService.server';
import {
  ToggleSharingInputSchema,
  RegenerateTokenInputSchema,
  RevokeAccessInputSchema,
  safeValidate,
} from '../schemas/validation.schemas';

/**
 * Server Action: Toggle Task Sharing
 * Enables or disables public sharing for a task
 */
export async function toggleTaskSharingAction(input: {
  taskId: string;
  enabled: boolean;
  commentsEnabled?: boolean;
  expiresInDays?: number;
}) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    // Validate input
    const validation = safeValidate(ToggleSharingInputSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { taskId, enabled, commentsEnabled, expiresInDays } = validation.data!;

    // Enable or disable sharing
    if (enabled) {
      return await enableTaskSharing(taskId, userId, {
        commentsEnabled,
        expiresInDays,
      });
    } else {
      return await disableTaskSharing(taskId, userId);
    }
  } catch (error) {
    console.error('[ShareActions] Error toggling task sharing:', error);
    return {
      success: false,
      error: 'Error al procesar la solicitud. Intenta de nuevo.',
    };
  }
}

/**
 * Server Action: Revoke Share Access
 * Disables sharing immediately
 */
export async function revokeShareAccessAction(input: { taskId: string }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    // Validate input
    const validation = safeValidate(RevokeAccessInputSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { taskId } = validation.data!;

    return await disableTaskSharing(taskId, userId);
  } catch (error) {
    console.error('[ShareActions] Error revoking access:', error);
    return {
      success: false,
      error: 'Error al revocar acceso. Intenta de nuevo.',
    };
  }
}

/**
 * Server Action: Update Comments Setting
 * Toggle comments on/off for a shared task
 */
export async function updateCommentsEnabledAction(input: {
  taskId: string;
  enabled: boolean;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    const { taskId, enabled } = input;

    return await updateCommentsEnabled(taskId, userId, enabled);
  } catch (error) {
    console.error('[ShareActions] Error updating comments setting:', error);
    return {
      success: false,
      error: 'Error al actualizar configuracion. Intenta de nuevo.',
    };
  }
}

/**
 * Server Action: Get Share Info
 * Returns sharing status and metadata for admin view
 */
export async function getShareInfoAction(taskId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    return await getShareInfo(taskId, userId);
  } catch (error) {
    console.error('[ShareActions] Error getting share info:', error);
    return {
      success: false,
      error: 'Error al obtener informacion. Intenta de nuevo.',
    };
  }
}
