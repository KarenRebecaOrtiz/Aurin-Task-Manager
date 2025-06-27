import { db } from './firebase';
import { collection, getDocs, query, deleteDoc, doc, addDoc, where, updateDoc, Timestamp } from 'firebase/firestore';

interface Task {
  AssignedTo: string[];
  LeadedBy: string[];
  CreatedBy?: string;
  name: string;
  archived?: boolean;
  archivedAt?: Timestamp | string;
  archivedBy?: string;
}

interface TaskWithActivity {
  lastActivity?: Timestamp | string;
  createdAt: Timestamp | string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: Timestamp | string };
}

// Función para actualizar la actividad de una tarea
export async function updateTaskActivity(taskId: string, activityType: 'message' | 'status_change' | 'edit' | 'time_entry') {
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'tasks', taskId), {
      lastActivity: now,
      hasUnreadUpdates: true,
    });
    console.log('[taskUtils] Task activity updated:', { taskId, activityType, timestamp: now });
  } catch (error) {
    console.error('[taskUtils] Error updating task activity:', error);
  }
}

// Función para marcar una tarea como vista por un usuario
export async function markTaskAsViewed(taskId: string, userId: string) {
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'tasks', taskId), {
      [`lastViewedBy.${userId}`]: now,
      hasUnreadUpdates: false, // Solo para el usuario actual, pero simplificamos por ahora
    });
    console.log('[taskUtils] Task marked as viewed:', { taskId, userId, timestamp: now });
  } catch (error) {
    console.error('[taskUtils] Error marking task as viewed:', error);
  }
}

// Función para obtener el timestamp de la última actividad de una tarea
export function getLastActivityTimestamp(task: TaskWithActivity): number {
  if (task.lastActivity) {
    return task.lastActivity instanceof Timestamp 
      ? task.lastActivity.toMillis() 
      : new Date(task.lastActivity).getTime();
  }
  // Si no hay lastActivity, usar createdAt
  return task.createdAt instanceof Timestamp 
    ? task.createdAt.toMillis() 
    : new Date(task.createdAt).getTime();
}

// Función para determinar si una tarea tiene actualizaciones no vistas para un usuario específico
export function hasUnreadUpdates(task: TaskWithActivity, userId: string): boolean {
  if (!task.hasUnreadUpdates) return false;
  
  // Si el usuario nunca ha visto la tarea, tiene actualizaciones no vistas
  if (!task.lastViewedBy || !task.lastViewedBy[userId]) return true;
  
  // Si la última actividad es más reciente que la última vez que el usuario vio la tarea
  const lastActivity = getLastActivityTimestamp(task);
  const lastViewed = task.lastViewedBy[userId] instanceof Timestamp 
    ? task.lastViewedBy[userId].toMillis() 
    : new Date(task.lastViewedBy[userId]).getTime();
  
  return lastActivity > lastViewed;
}

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
    console.log('[taskUtils] Deleted messages for task:', taskId);

    // Eliminar timers de la tarea
    const timersQuery = query(collection(db, `tasks/${taskId}/timers`));
    const timersSnapshot = await getDocs(timersQuery);
    const deleteTimersPromises = timersSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deleteTimersPromises);
    console.log('[taskUtils] Deleted timers for task:', taskId);

    // Eliminar notificaciones
    const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', taskId));
    const notificationsSnapshot = await getDocs(notificationsQuery);
    for (const notifDoc of notificationsSnapshot.docs) {
      await deleteDoc(doc(db, 'notifications', notifDoc.id));
      console.log('[taskUtils] Deleted notification:', notifDoc.id);
    }

    // Enviar notificaciones
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId);
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        taskId,
        message: `Usuario eliminó la tarea ${task.name}`,
        timestamp: Timestamp.now(),
        read: false,
        recipientId,
      });
      console.log('[taskUtils] Sent notification to:', recipientId);
    }

    // Eliminar tarea
    await deleteDoc(doc(db, 'tasks', taskId));
    console.log('[taskUtils] Task deleted successfully:', taskId);
  } catch (error) {
    throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}

// Función para archivar una tarea
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

    // Enviar notificaciones
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId);
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        taskId,
        message: `Usuario archivó la tarea ${task.name}`,
        timestamp: now,
        read: false,
        recipientId,
      });
      console.log('[taskUtils] Sent archive notification to:', recipientId);
    }

    console.log('[taskUtils] Task archived successfully:', taskId);
  } catch (error) {
    throw new Error(`Failed to archive task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}

// Función para desarchivar una tarea
export async function unarchiveTask(taskId: string, userId: string, isAdmin: boolean, task: Task) {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Verificar permisos
    if (!isAdmin && task.CreatedBy !== userId) {
      throw new Error('No tienes permisos para desarchivar esta tarea');
    }

    const now = Timestamp.now();
    await updateDoc(doc(db, 'tasks', taskId), {
      archived: false,
      archivedAt: null,
      archivedBy: null,
    });

    // Enviar notificaciones
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId);
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        taskId,
        message: `Usuario desarchivó la tarea ${task.name}`,
        timestamp: now,
        read: false,
        recipientId,
      });
      console.log('[taskUtils] Sent unarchive notification to:', recipientId);
    }

    console.log('[taskUtils] Task unarchived successfully:', taskId);
  } catch (error) {
    throw new Error(`Failed to unarchive task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}