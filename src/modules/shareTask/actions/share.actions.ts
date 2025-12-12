// src/modules/shareTask/actions/share.actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import {
  enableTaskSharing,
  disableTaskSharing,
  updateCommentsEnabled,
  getShareInfo,
  enableTeamSharing,
  disableTeamSharing,
  updateTeamCommentsEnabled,
  getTeamShareInfo,
} from '../services/shareService.server';
import {
  ToggleSharingInputSchema,
  RegenerateTokenInputSchema,
  RevokeAccessInputSchema,
  safeValidate,
} from '../schemas/validation.schemas';

/** Entity type for sharing - supports both tasks and teams */
export type ShareEntityType = 'task' | 'team';

/**
 * Server Action: Toggle Task/Team Sharing
 * Enables or disables public sharing for a task or team
 */
export async function toggleTaskSharingAction(input: {
  taskId: string;
  enabled: boolean;
  commentsEnabled?: boolean;
  expiresInDays?: number;
  entityType?: ShareEntityType;
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
    const entityType = input.entityType || 'task';

    // Enable or disable sharing based on entity type
    if (entityType === 'team') {
      if (enabled) {
        return await enableTeamSharing(taskId, userId, {
          commentsEnabled,
          expiresInDays,
        });
      } else {
        return await disableTeamSharing(taskId, userId);
      }
    } else {
      if (enabled) {
        return await enableTaskSharing(taskId, userId, {
          commentsEnabled,
          expiresInDays,
        });
      } else {
        return await disableTaskSharing(taskId, userId);
      }
    }
  } catch (error) {
    console.error('[ShareActions] Error toggling sharing:', error);
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
 * Toggle comments on/off for a shared task or team
 */
export async function updateCommentsEnabledAction(input: {
  taskId: string;
  enabled: boolean;
  entityType?: ShareEntityType;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    const { taskId, enabled, entityType = 'task' } = input;

    if (entityType === 'team') {
      return await updateTeamCommentsEnabled(taskId, userId, enabled);
    }
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
export async function getShareInfoAction(taskId: string, entityType: ShareEntityType = 'task') {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    if (entityType === 'team') {
      return await getTeamShareInfo(taskId, userId);
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
