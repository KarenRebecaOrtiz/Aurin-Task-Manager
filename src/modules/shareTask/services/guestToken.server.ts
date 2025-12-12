// src/modules/shareTask/services/guestToken.server.ts
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateShareToken, buildShareUrl } from './tokenService';
import { ERROR_MESSAGES } from '../utils/constants';
import { canUserShareTask, canUserShareTeam } from '../utils/authHelpers.server';

const MAX_GUEST_TOKENS = 3;

/**
 * Generate a new guest token for a task
 * @param taskId - Task ID
 * @param userId - User ID creating the token
 * @param tokenName - Optional name for the token (e.g. "Token para Juan")
 */
export async function generateGuestToken(
  taskId: string,
  userId: string,
  tokenName?: string
) {
  const adminDb = getAdminDb();
  const taskRef = adminDb.collection('tasks').doc(taskId);
  const shareTokensRef = taskRef.collection('shareTokens');

  // Check authorization
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) {
    return { success: false, error: 'Tarea no encontrada' };
  }
  const taskData = taskSnap.data()!;

  // Authorization check - admin OR involved in task
  const canShare = await canUserShareTask(userId, taskData);
  if (!canShare) {
    return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
  }

  // Check token limit
  const tokensSnap = await shareTokensRef.get();
  if (tokensSnap.size >= MAX_GUEST_TOKENS) {
    return {
      success: false,
      error: `No se pueden generar más de ${MAX_GUEST_TOKENS} tokens por tarea.`,
    };
  }

  // Generate new token
  const token = generateShareToken();
  const newTokenRef = shareTokensRef.doc();

  // Tokens NO tienen expiración fija
  // Son válidos mientras la tarea tenga shared=true
  await newTokenRef.set({
    token,
    status: 'pending',
    tokenName: tokenName || null, // Nombre del token (ej: "Token para Juan")
    guestName: null, // Se asigna cuando se redime el token
    avatar: null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: null, // No expiration - valid while task.shared=true
    redeemedAt: null,
  });

  return {
    success: true,
    token: {
      id: newTokenRef.id,
      token,
      status: 'pending',
      tokenName: tokenName || null,
      guestName: null,
      avatar: null,
    },
  };
}

/**
 * Revoke a guest token
 */
export async function revokeGuestToken(taskId: string, userId: string, tokenId: string) {
  const adminDb = getAdminDb();
  const taskRef = adminDb.collection('tasks').doc(taskId);
  const tokenRef = taskRef.collection('shareTokens').doc(tokenId);

  // Authorization check
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) {
    return { success: false, error: 'Tarea no encontrada' };
  }
  const taskData = taskSnap.data()!;

  // Authorization check - admin OR involved in task
  const canShare = await canUserShareTask(userId, taskData);
  if (!canShare) {
    return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
  }

  await tokenRef.delete();

  return { success: true };
}

/**
 * Get all guest tokens for a task
 */
export async function getGuestTokens(taskId: string, userId: string) {
  const adminDb = getAdminDb();
  const taskRef = adminDb.collection('tasks').doc(taskId);
  const shareTokensRef = taskRef.collection('shareTokens');

  // Authorization check
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) {
    return { success: false, error: 'Tarea no encontrada' };
  }
  const taskData = taskSnap.data()!;

  // Authorization check - admin OR involved in task
  const canShare = await canUserShareTask(userId, taskData);
  if (!canShare) {
    return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
  }

  const tokensSnap = await shareTokensRef.orderBy('createdAt', 'desc').get();
  const tokens = tokensSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      token: data.token,
      status: data.status,
      tokenName: data.tokenName || null,
      guestName: data.guestName,
      avatar: data.avatar,
      createdAt: data.createdAt.toDate().toISOString(),
      expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
      shareUrl: buildShareUrl(data.token),
    };
  });

  return { success: true, tokens };
}

import { createGuestSession } from './session.server';

/**
 * Redeem a guest token
 */
export async function redeemGuestToken(
  token: string,
  guestName: string,
  avatar: string
) {
  const adminDb = getAdminDb();
  const tokensQuery = adminDb
    .collectionGroup('shareTokens')
    .where('token', '==', token)
    .where('status', '==', 'pending');

  const querySnap = await tokensQuery.get();

  if (querySnap.empty) {
    return { success: false, error: 'Token inválido o ya utilizado.' };
  }

  const tokenDoc = querySnap.docs[0];
  await tokenDoc.ref.update({
    status: 'redeemed',
    guestName,
    avatar,
    redeemedAt: FieldValue.serverTimestamp(),
  });

  const taskRef = tokenDoc.ref.parent.parent!;
  const taskSnap = await taskRef.get();
  const taskData = taskSnap.data();

  // Create a guest session
  await createGuestSession({
    guestName,
    avatar,
    taskId: taskRef.id,
  });

  return { success: true, taskId: taskRef.id, taskName: taskData?.name };
}

// ============================================
// TEAM GUEST TOKEN FUNCTIONS
// ============================================

/**
 * Generate a new guest token for a team
 * @param teamId - Team ID
 * @param userId - User ID creating the token
 * @param tokenName - Optional name for the token (e.g. "Token para Juan")
 */
export async function generateTeamGuestToken(
  teamId: string,
  userId: string,
  tokenName?: string
) {
  const adminDb = getAdminDb();
  const teamRef = adminDb.collection('teams').doc(teamId);
  const shareTokensRef = teamRef.collection('shareTokens');

  // Check authorization
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    return { success: false, error: 'Equipo no encontrado' };
  }
  const teamData = teamSnap.data()!;

  // Authorization check - admin OR member of team
  const canShare = await canUserShareTeam(userId, teamData);
  if (!canShare) {
    return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
  }

  // Check token limit
  const tokensSnap = await shareTokensRef.get();
  if (tokensSnap.size >= MAX_GUEST_TOKENS) {
    return {
      success: false,
      error: `No se pueden generar más de ${MAX_GUEST_TOKENS} tokens por equipo.`,
    };
  }

  // Generate new token
  const token = generateShareToken();
  const newTokenRef = shareTokensRef.doc();

  await newTokenRef.set({
    token,
    status: 'pending',
    tokenName: tokenName || null,
    guestName: null,
    avatar: null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: null,
    redeemedAt: null,
  });

  return {
    success: true,
    token: {
      id: newTokenRef.id,
      token,
      status: 'pending',
      tokenName: tokenName || null,
      guestName: null,
      avatar: null,
    },
  };
}

/**
 * Revoke a guest token for a team
 */
export async function revokeTeamGuestToken(teamId: string, userId: string, tokenId: string) {
  const adminDb = getAdminDb();
  const teamRef = adminDb.collection('teams').doc(teamId);
  const tokenRef = teamRef.collection('shareTokens').doc(tokenId);

  // Authorization check
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    return { success: false, error: 'Equipo no encontrado' };
  }
  const teamData = teamSnap.data()!;

  // Authorization check - admin OR member of team
  const canShare = await canUserShareTeam(userId, teamData);
  if (!canShare) {
    return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
  }

  await tokenRef.delete();

  return { success: true };
}

/**
 * Get all guest tokens for a team
 */
export async function getTeamGuestTokens(teamId: string, userId: string) {
  const adminDb = getAdminDb();
  const teamRef = adminDb.collection('teams').doc(teamId);
  const shareTokensRef = teamRef.collection('shareTokens');

  // Authorization check
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    return { success: false, error: 'Equipo no encontrado' };
  }
  const teamData = teamSnap.data()!;

  // Authorization check - admin OR member of team
  const canShare = await canUserShareTeam(userId, teamData);
  if (!canShare) {
    return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
  }

  const tokensSnap = await shareTokensRef.orderBy('createdAt', 'desc').get();
  const tokens = tokensSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      token: data.token,
      status: data.status,
      tokenName: data.tokenName || null,
      guestName: data.guestName,
      avatar: data.avatar,
      createdAt: data.createdAt.toDate().toISOString(),
      expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
      shareUrl: buildShareUrl(data.token),
    };
  });

  return { success: true, tokens };
}
