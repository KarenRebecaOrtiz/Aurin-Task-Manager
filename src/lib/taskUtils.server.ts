/**
 * Task Utils - SERVER ONLY
 *
 * Functions that require server-only dependencies (mailer, etc.)
 * These functions should ONLY be called from:
 * - API routes
 * - Server Actions
 * - Server Components
 *
 * ⚠️ DO NOT import this in client components!
 */

import 'server-only';

import { db } from './firebase';
import { collection, getDocs, query, deleteDoc, doc, where, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { mailer } from '@/modules/mailer';
import { refreshTasksCache } from '@/services/taskService';

// Helper function for conditional logging (only in development)
const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
};

// Helper function for conditional error logging (only in development)
const debugError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }
};

interface Task {
  id: string;
  AssignedTo: string[];
  LeadedBy: string[];
  CreatedBy?: string;
  name: string;
  archived?: boolean;
  archivedAt?: Timestamp | string;
  archivedBy?: string;
}

// Función para archivar tareas con batching
export async function archiveTasks(tasks: Task[], userId: string, isAdmin: boolean) {
  try {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    tasks.forEach(task => {
      if (isAdmin || task.CreatedBy === userId) {
        const taskRef = doc(db, 'tasks', task.id);
        batch.update(taskRef, {
          archived: true,
          archivedAt: now,
          archivedBy: userId,
        });
      }
    });

    await batch.commit();
    debugLog(`[taskUtils] Archived ${tasks.length} tasks successfully`);
  } catch (error) {
    debugError('[taskUtils] Error archiving tasks:', error);
    throw error;
  }
}

// Función para desarchivar tareas con batching
export async function unarchiveTasks(tasks: Task[], userId: string, isAdmin: boolean) {
  try {
    const batch = writeBatch(db);

    tasks.forEach(task => {
      if (isAdmin || task.CreatedBy === userId) {
        const taskRef = doc(db, 'tasks', task.id);
        batch.update(taskRef, {
          archived: false,
          archivedAt: null,
          archivedBy: null,
        });
      }
    });

    await batch.commit();
    debugLog(`[taskUtils] Unarchived ${tasks.length} tasks successfully`);
  } catch (error) {
    debugError('[taskUtils] Error unarchiving tasks:', error);
    throw error;
  }
}

// Función para eliminar tareas con batching
export async function deleteTasks(tasks: Task[], userId: string, isAdmin: boolean) {
  try {
    const batch = writeBatch(db);

    tasks.forEach(task => {
      if (isAdmin || task.CreatedBy === userId) {
        const taskRef = doc(db, 'tasks', task.id);
        batch.delete(taskRef);
      }
    });

    await batch.commit();
    debugLog(`[taskUtils] Deleted ${tasks.length} tasks successfully`);
  } catch (error) {
    debugError('[taskUtils] Error deleting tasks:', error);
    throw error;
  }
}

// Función para crear notificaciones en batch
export async function createBatchNotifications(notifications: Array<{
  userId: string;
  taskId: string;
  message: string;
  recipientId: string;
  type: string;
}>) {
  try {
    const batch = writeBatch(db);

    notifications.forEach(notification => {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        ...notification,
        timestamp: Timestamp.now(),
        read: false,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 días
      });
    });

    await batch.commit();
    debugLog(`[taskUtils] Created ${notifications.length} notifications in batch`);
  } catch (error) {
    debugError('[taskUtils] Error creating batch notifications:', error);
    throw error;
  }
}

// Función para marcar notificaciones como leídas en batch
export async function markNotificationsAsRead(notificationIds: string[]) {
  try {
    const batch = writeBatch(db);

    notificationIds.forEach(notifId => {
      const notifRef = doc(db, 'notifications', notifId);
      batch.update(notifRef, { read: true });
    });

    await batch.commit();
    debugLog(`[taskUtils] Marked ${notificationIds.length} notifications as read`);
  } catch (error) {
    debugError('[taskUtils] Error marking notifications as read:', error);
    throw error;
  }
}

// ==========================================
// SERVER-ONLY FUNCTIONS WITH MAILER
// ==========================================

/**
 * Delete a task (SERVER ONLY - uses mailer)
 */
export async function deleteTask(taskId: string, userId: string, isAdmin: boolean, task: Task) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Verificar permisos
    if (!isAdmin && task.CreatedBy !== userId) {
      throw new Error('No tienes permisos para eliminar esta tarea');
    }

    // Eliminar mensajes de la tarea
    const messagesQuery = query(collection(db, `tasks/${taskId}/messages`));
    const messagesSnapshot = await getDocs(messagesQuery);
    const deleteMessagesPromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deleteMessagesPromises);
    debugLog('[taskUtils] Deleted messages for task:', taskId);

    // Eliminar timers de la tarea
    const timersQuery = query(collection(db, `tasks/${taskId}/timers`));
    const timersSnapshot = await getDocs(timersQuery);
    const deleteTimersPromises = timersSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deleteTimersPromises);
    debugLog('[taskUtils] Deleted timers for task:', taskId);

    // Eliminar notificaciones existentes para esta tarea
    const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', taskId));
    const notificationsSnapshot = await getDocs(notificationsQuery);
    for (const notifDoc of notificationsSnapshot.docs) {
      await deleteDoc(doc(db, 'notifications', notifDoc.id));
      debugLog('[taskUtils] Deleted notification:', notifDoc.id);
    }

    // Send email notifications to involved users (using new mailer module)
    const recipients = [...task.AssignedTo, ...task.LeadedBy];
    if (task.CreatedBy) recipients.push(task.CreatedBy);

    if (recipients.length > 0) {
      try {
        const result = await mailer.notifyTaskDeleted({
          recipientIds: recipients,
          taskId,
          actorId: userId,
        });
        debugLog('[taskUtils] Delete email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
      } catch (error) {
        debugError('[taskUtils] Error sending delete email notifications:', error);
        // Don't fail the main operation due to notification errors
      }
    }

    // Eliminar tarea
    await deleteDoc(doc(db, 'tasks', taskId));
    debugLog('[taskUtils] Task deleted successfully:', taskId);

    // Refrescar caché de taskService con datos actualizados
    await refreshTasksCache();
  } catch (error) {
    throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}

/**
 * Archive a task (SERVER ONLY - uses mailer)
 */
export async function archiveTask(taskId: string, userId: string, isAdmin: boolean, task: Task) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Verificar permisos
    if (!isAdmin && task.CreatedBy !== userId) {
      throw new Error('No tienes permisos para archivar esta tarea');
    }

    const now = Timestamp.now();
    await updateDoc(doc(db, 'tasks', taskId), {
      archived: true,
      archivedAt: now,
      archivedBy: userId,
    });

    // Send email notifications to involved users (using new mailer module)
    const recipients = [...task.AssignedTo, ...task.LeadedBy];
    if (task.CreatedBy) recipients.push(task.CreatedBy);

    if (recipients.length > 0) {
      try {
        const result = await mailer.notifyTaskArchived({
          recipientIds: recipients,
          taskId,
          actorId: userId,
        });
        debugLog('[taskUtils] Archive email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
      } catch (error) {
        debugError('[taskUtils] Error sending archive email notifications:', error);
        // Don't fail the main operation due to notification errors
      }
    }

    debugLog('[taskUtils] Task archived successfully:', taskId);

    // Refrescar caché de taskService con datos actualizados
    await refreshTasksCache();
  } catch (error) {
    throw new Error(`Failed to archive task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}

/**
 * Unarchive a task (SERVER ONLY - uses mailer)
 */
export async function unarchiveTask(taskId: string, userId: string, isAdmin: boolean, task: Task) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Verificar permisos
    if (!isAdmin && task.CreatedBy !== userId) {
      throw new Error('No tienes permisos para desarchivar esta tarea');
    }

    await updateDoc(doc(db, 'tasks', taskId), {
      archived: false,
      archivedAt: null,
      archivedBy: null,
    });

    // Send email notifications to involved users (using new mailer module)
    const recipients = [...task.AssignedTo, ...task.LeadedBy];
    if (task.CreatedBy) recipients.push(task.CreatedBy);

    if (recipients.length > 0) {
      try {
        const result = await mailer.notifyTaskUnarchived({
          recipientIds: recipients,
          taskId,
          actorId: userId,
        });
        debugLog('[taskUtils] Unarchive email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
      } catch (error) {
        debugError('[taskUtils] Error sending unarchive email notifications:', error);
        // Don't fail the main operation due to notification errors
      }
    }

    debugLog('[taskUtils] Task unarchived successfully:', taskId);

    // Refrescar caché de taskService con datos actualizados
    await refreshTasksCache();
  } catch (error) {
    throw new Error(`Failed to unarchive task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}
