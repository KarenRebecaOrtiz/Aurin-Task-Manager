// src/modules/shareTask/services/shareService.server.ts
import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateShareToken, buildShareUrl, isTokenExpired, calculateTokenExpiry } from './tokenService';
import { sanitizeTaskForPublic, PublicTask } from '../schemas/validation.schemas';
import { ERROR_MESSAGES } from '../utils/constants';
import { generateGuestToken } from './guestToken.server';
import { canUserShareTask } from '../utils/authHelpers.server';
import { getUsersInfo } from '@/modules/n8n-chatbot/lib/users/get-users';

/**
 * ShareService - SERVER VERSION
 * Uses Firebase Admin SDK for server-side operations
 * Bypasses Firestore security rules
 */

/**
 * Enable sharing for a task
 * Generates a new token and updates task document
 */
export async function enableTaskSharing(
  taskId: string,
  userId: string,
  options: {
    commentsEnabled?: boolean;
    expiresInDays?: number;
    maxAccess?: number;
  } = {}
): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
  try {
    const adminDb = getAdminDb();

    // Verify user owns the task
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const task = taskSnap.data();
    if (!task) {
      return { success: false, error: 'Datos de tarea invalidos' };
    }

    // Authorization check - admin OR involved in task
    const canShare = await canUserShareTask(userId, task);
    if (!canShare) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
    }

    // Update task with sharing fields
    await taskRef.update({
      shared: true,
      commentsEnabled: options.commentsEnabled || false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // NOTE: Los tokens se generan manualmente desde la UI usando generateGuestTokenAction
    // No se genera automáticamente un token aquí

    return {
      success: true,
    };
  } catch (error) {
    console.error('[ShareService.Server] Error enabling task sharing:', error);
    return {
      success: false,
      error: 'Error al activar compartir. Intenta de nuevo.',
    };
  }
}

/**
 * Disable sharing for a task
 * Clears share token and flags
 */
export async function disableTaskSharing(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const task = taskSnap.data();
    if (!task) {
      return { success: false, error: 'Datos de tarea invalidos' };
    }

    // Authorization check - admin OR involved in task
    const canShare = await canUserShareTask(userId, task);
    if (!canShare) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
    }

    // Clear sharing fields
    await taskRef.update({
      shared: false,
      shareToken: null,
      commentsEnabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete all guest tokens to invalidate sessions
    const tokensRef = taskRef.collection('shareTokens');
    const tokensSnap = await tokensRef.get();
    const batch = adminDb.batch();
    tokensSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('[ShareService.Server] Error disabling task sharing:', error);
    return {
      success: false,
      error: 'Error al desactivar compartir. Intenta de nuevo.',
    };
  }
}

/**
 * Get public task by task ID (without token validation)
 * Used for the /guest/[taskId] route to check if task exists and is shared
 */
export async function getPublicTaskByTaskId(
  taskId: string
): Promise<{ success: boolean; task?: PublicTask; error?: string }> {
  try {
    console.log('[getPublicTaskByTaskId] Fetching task:', taskId);
    const adminDb = getAdminDb();
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    console.log('[getPublicTaskByTaskId] Task exists:', taskDoc.exists);

    if (!taskDoc.exists) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const taskData = { id: taskDoc.id, ...taskDoc.data() } as any;
    console.log('[getPublicTaskByTaskId] Task data:', {
      id: taskData.id,
      Name: taskData.Name,
      shared: taskData.shared,
      keys: Object.keys(taskData)
    });

    // Verificar que la tarea esté compartida
    if (!taskData.shared) {
      return { success: false, error: 'Esta tarea no está disponible públicamente' };
    }

    // Obtener información de participantes
    const participantIds = new Set<string>();
    if (taskData.CreatedBy) participantIds.add(taskData.CreatedBy);
    if (taskData.LeadedBy) taskData.LeadedBy.forEach((id: string) => participantIds.add(id));
    if (taskData.AssignedTo) taskData.AssignedTo.forEach((id: string) => participantIds.add(id));

    const participantsResult = await getUsersInfo(Array.from(participantIds));
    const participants = participantsResult.success ? participantsResult.users : [];

    // Sanitize task data for public consumption
    const publicTask = sanitizeTaskForPublic(taskData, participants);

    return {
      success: true,
      task: publicTask,
    };
  } catch (error) {
    console.error('[getPublicTaskByTaskId] Error:', error);
    return {
      success: false,
      error: 'Error al cargar la tarea. Intenta de nuevo.',
    };
  }
}

/**
 * Get public task by share token
 * Validates token, checks expiration, and returns sanitized data
 */
export async function getPublicTask(
  token: string
): Promise<{ success: boolean; task?: PublicTask; error?: string; tokenStatus?: 'pending' | 'redeemed' }> {
  try {
    const adminDb = getAdminDb();

    // Query collection group to find the token
    const tokensQuery = adminDb
      .collectionGroup('shareTokens')
      .where('token', '==', token);
      
    const querySnapshot = await tokensQuery.get();

    if (querySnapshot.empty) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_TOKEN,
      };
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();
    const taskRef = tokenDoc.ref.parent.parent!;

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const taskData = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Verificar que la tarea esté compartida
    // Los tokens son válidos SOLO mientras shared=true
    if (!taskData.shared) {
      return { success: false, error: 'Esta tarea no está disponible públicamente' };
    }

    // Si el token tiene expiresAt (legacy), verificar también
    if (tokenData.expiresAt && isTokenExpired(tokenData.expiresAt)) {
      return {
        success: false,
        error: 'El enlace ha expirado',
      };
    }

    // Increment access count and update last access
    await taskDoc.ref.update({
      shareAccessCount: FieldValue.increment(1),
      shareLastAccess: FieldValue.serverTimestamp(),
    });

    // Obtener información de participantes
    const participantIds = new Set<string>();
    if (taskData.CreatedBy) participantIds.add(taskData.CreatedBy);
    if (taskData.LeadedBy) taskData.LeadedBy.forEach((id: string) => participantIds.add(id));
    if (taskData.AssignedTo) taskData.AssignedTo.forEach((id: string) => participantIds.add(id));

    const participants = [];
    for (const userId of participantIds) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const userName = userData?.displayName || userData?.fullName || userData?.firstName || 'Usuario';
          const userAvatar = userData?.profilePhoto || userData?.imageUrl || userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;

          participants.push({
            id: userId,
            name: userName,
            avatar: userAvatar,
          });
        }
      } catch (error) {
        console.error('[getPublicTask] Error fetching user:', userId, error);
      }
    }

    // Sanitize task data for public consumption
    const publicTask = sanitizeTaskForPublic(taskData, participants);

    return {
      success: true,
      task: publicTask,
      tokenStatus: tokenData.status,
    };
  } catch (error) {
    console.error('[ShareService.Server] Error getting public task:', error);
    return {
      success: false,
      error: 'Error al cargar la tarea. Intenta de nuevo.',
    };
  }
}

/**
 * Update comments enabled setting
 */
export async function updateCommentsEnabled(
  taskId: string,
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const task = taskSnap.data();
    if (!task) {
      return { success: false, error: 'Datos de tarea invalidos' };
    }

    // Authorization check - admin OR involved in task
    const canShare = await canUserShareTask(userId, task);
    if (!canShare) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
    }

    if (!task.shared) {
      return { success: false, error: 'La tarea no esta compartida' };
    }

    // Update commentsEnabled
    await taskRef.update({
      commentsEnabled: enabled,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('[ShareService.Server] Error updating comments setting:', error);
    return {
      success: false,
      error: 'Error al actualizar configuracion. Intenta de nuevo.',
    };
  }
}

/**
 * Check if task is currently shared
 */
export async function isTaskShared(taskId: string): Promise<boolean> {
  try {
    const adminDb = getAdminDb();

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return false;
    }

    const task = taskSnap.data();
    return task?.shared === true;
  } catch (error) {
    console.error('[ShareService.Server] Error checking if task is shared:', error);
    return false;
  }
}

/**
 * Get share info for a task (for admin view)
 */
export async function getShareInfo(
  taskId: string,
  userId: string
): Promise<{
  success: boolean;
  info?: {
    isShared: boolean;
    shareUrl?: string;
    commentsEnabled?: boolean;
    expiresAt?: string | null;
    accessCount?: number;
    lastAccess?: string | null;
  };
  error?: string;
}> {
  try {
    const adminDb = getAdminDb();

    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const task = taskSnap.data();
    if (!task) {
      return { success: false, error: 'Datos de tarea invalidos' };
    }

    // Authorization check - admin OR involved in task
    const canView = await canUserShareTask(userId, task);
    if (!canView) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED };
    }

    if (!task.shared) {
      return {
        success: true,
        info: {
          isShared: false,
        },
      };
    }

    // This part is now legacy, as links are per-token.
    // We can return the first token's URL or just a generic message.
    const shareUrl = task.shareToken ? buildShareUrl(task.shareToken) : undefined;

    // Convert Firestore Timestamp to ISO string if needed
    const lastAccess = task.shareLastAccess
      ? task.shareLastAccess.toDate
        ? task.shareLastAccess.toDate().toISOString()
        : task.shareLastAccess
      : null;

    return {
      success: true,
      info: {
        isShared: true,
        shareUrl,
        commentsEnabled: task.commentsEnabled || false,
        expiresAt: task.shareExpiresAt || null,
        accessCount: task.shareAccessCount || 0,
        lastAccess,
      },
    };
  } catch (error) {
    console.error('[ShareService.Server] Error getting share info:', error);
    return {
      success: false,
      error: 'Error al obtener informacion.',
    };
  }
}
