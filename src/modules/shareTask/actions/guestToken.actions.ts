// src/modules/shareTask/actions/guestToken.actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import {
  generateGuestToken,
  revokeGuestToken,
  getGuestTokens,
  redeemGuestToken,
  generateTeamGuestToken,
  revokeTeamGuestToken,
  getTeamGuestTokens,
} from '../services/guestToken.server';
import {
  safeValidate,
  GenerateGuestTokenInputSchema,
  RevokeGuestTokenInputSchema,
  RedeemGuestTokenInputSchema,
} from '../schemas/validation.schemas';

/** Entity type for sharing - supports both tasks and teams */
export type ShareEntityType = 'task' | 'team';

/**
 * Server Action: Generate a new guest token for a task or team
 */
export async function generateGuestTokenAction(input: {
  taskId: string;
  tokenName?: string;
  entityType?: ShareEntityType;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    const validation = safeValidate(GenerateGuestTokenInputSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { taskId, tokenName } = validation.data!;
    const entityType = input.entityType || 'task';

    if (entityType === 'team') {
      return await generateTeamGuestToken(taskId, userId, tokenName);
    }
    return await generateGuestToken(taskId, userId, tokenName);
  } catch (error) {
    console.error('[GuestTokenActions] Error generating guest token:', error);
    return {
      success: false,
      error: 'Error al generar el token de invitado.',
    };
  }
}

/**
 * Server Action: Revoke a guest token
 */
export async function revokeGuestTokenAction(input: {
  taskId: string;
  tokenId: string;
  entityType?: ShareEntityType;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    const validation = safeValidate(RevokeGuestTokenInputSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { taskId, tokenId } = validation.data!;
    const entityType = input.entityType || 'task';

    if (entityType === 'team') {
      return await revokeTeamGuestToken(taskId, userId, tokenId);
    }
    return await revokeGuestToken(taskId, userId, tokenId);
  } catch (error) {
    console.error('[GuestTokenActions] Error revoking guest token:', error);
    return {
      success: false,
      error: 'Error al revocar el token de invitado.',
    };
  }
}

/**
 * Server Action: Get all guest tokens for a task or team
 */
export async function getGuestTokensAction(taskId: string, entityType: ShareEntityType = 'task') {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'No autenticado' };
    }

    if (entityType === 'team') {
      return await getTeamGuestTokens(taskId, userId);
    }
    return await getGuestTokens(taskId, userId);
  } catch (error) {
    console.error('[GuestTokenActions] Error getting guest tokens:', error);
    return {
      success: false,
      error: 'Error al obtener los tokens de invitado.',
    };
  }
}

/**
 * Server Action: Redeem a guest token
 */
export async function redeemGuestTokenAction(input: {
  token: string;
  guestName: string;
  avatar: string;
}) {
  try {
    const validation = safeValidate(RedeemGuestTokenInputSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { token, guestName, avatar } = validation.data!;
    return await redeemGuestToken(token, guestName, avatar);
  } catch (error) {
    console.error('[GuestTokenActions] Error redeeming guest token:', error);
    return {
      success: false,
      error: 'Error al redimir el token de invitado.',
    };
  }
}
