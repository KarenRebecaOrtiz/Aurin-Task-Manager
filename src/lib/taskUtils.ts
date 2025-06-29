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

// Función para marcar una tarea como vista por un usuario (estilo red social)
export async function markTaskAsViewed(taskId: string, userId: string) {
  try {
    const now = Timestamp.now();
    
    // Actualizar el timestamp de última vista para este usuario específico
    await updateDoc(doc(db, 'tasks', taskId), {
      [`lastViewedBy.${userId}`]: now,
    });
    
    console.log('[taskUtils] Task marked as viewed:', { taskId, userId, timestamp: now });
    
    // Opcional: Si todos los usuarios asignados han visto la tarea, marcar hasUnreadUpdates como false
    // Esto es opcional y depende de si quieres que el flag general se mantenga o no
    // await checkAndUpdateGlobalUnreadStatus(taskId);
    
  } catch (error) {
    console.error('[taskUtils] Error marking task as viewed:', error);
    throw new Error(`Failed to mark task as viewed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

// Función simple para calcular notificaciones no leídas
export function getUnreadCount(task: TaskWithActivity, userId: string): number {
  console.log('[getUnreadCount] Called with:', {
    taskId: (task as TaskWithActivity & { id: string }).id,
    userId,
    hasUnreadUpdates: task.hasUnreadUpdates,
    lastViewedBy: task.lastViewedBy,
    lastActivity: task.lastActivity,
  });

  // Si no hay userId, no hay notificaciones
  if (!userId) {
    console.log('[getUnreadCount] No userId, returning 0');
    return 0;
  }
  
  // Si la tarea no tiene actualizaciones, no hay notificaciones
  if (!task.hasUnreadUpdates) {
    console.log('[getUnreadCount] No unread updates, returning 0');
    return 0;
  }
  
  // Si el usuario nunca ha visto la tarea, tiene 1 notificación
  if (!task.lastViewedBy || !task.lastViewedBy[userId]) {
    console.log('[getUnreadCount] User never viewed, returning 1');
    return 1;
  }
  
  // Si hay última actividad y es más reciente que la última vista
  if (task.lastActivity) {
    const lastActivity = task.lastActivity instanceof Timestamp 
      ? task.lastActivity.toMillis() 
      : new Date(task.lastActivity).getTime();
    
    const lastViewed = task.lastViewedBy[userId] instanceof Timestamp 
      ? task.lastViewedBy[userId].toMillis() 
      : new Date(task.lastViewedBy[userId]).getTime();
    
    console.log('[getUnreadCount] Comparing timestamps:', {
      lastActivity,
      lastViewed,
      lastActivityDate: new Date(lastActivity),
      lastViewedDate: new Date(lastViewed),
      isNewer: lastActivity > lastViewed,
    });
    
    if (lastActivity > lastViewed) {
      console.log('[getUnreadCount] Activity is newer, returning 1');
      return 1; // Una notificación por tarea no vista
    }
  }
  
  console.log('[getUnreadCount] No conditions met, returning 0');
  return 0;
}

// Función simple para verificar si hay notificaciones
export function hasUnreadUpdates(task: TaskWithActivity, userId: string): boolean {
  return getUnreadCount(task, userId) > 0;
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

    // Eliminar notificaciones existentes para esta tarea
    const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', taskId));
    const notificationsSnapshot = await getDocs(notificationsQuery);
    for (const notifDoc of notificationsSnapshot.docs) {
      await deleteDoc(doc(db, 'notifications', notifDoc.id));
      console.log('[taskUtils] Deleted notification:', notifDoc.id);
    }

    // Enviar notificaciones a los usuarios involucrados
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId); // Excluir al usuario que realiza la acción
    const now = Timestamp.now();
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId, // ID del usuario que realiza la acción
        taskId,
        message: `Usuario eliminó la tarea "${task.name}"`,
        timestamp: now,
        read: false,
        recipientId, // ID del usuario que recibe la notificación
        type: 'task_deleted', // Añadir tipo para mejor manejo
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

    // Enviar notificaciones a los usuarios involucrados
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId); // Excluir al usuario que realiza la acción
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId, // ID del usuario que realiza la acción
        taskId,
        message: `Usuario archivó la tarea "${task.name}"`,
        timestamp: now,
        read: false,
        recipientId, // ID del usuario que recibe la notificación
        type: 'task_archived', // Añadir tipo para mejor manejo
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

    // Enviar notificaciones a los usuarios involucrados
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(userId); // Excluir al usuario que realiza la acción
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId, // ID del usuario que realiza la acción
        taskId,
        message: `Usuario desarchivó la tarea "${task.name}"`,
        timestamp: now,
        read: false,
        recipientId, // ID del usuario que recibe la notificación
        type: 'task_unarchived', // Añadir tipo para mejor manejo
      });
      console.log('[taskUtils] Sent unarchive notification to:', recipientId);
    }

    console.log('[taskUtils] Task unarchived successfully:', taskId);
  } catch (error) {
    throw new Error(`Failed to unarchive task: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}

// Función para inicializar hasUnreadUpdates en tareas existentes
export async function initializeUnreadUpdates() {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const updatePromises = tasksSnapshot.docs.map(async (doc) => {
      const taskData = doc.data();
      if (taskData.hasUnreadUpdates === undefined) {
        console.log('[taskUtils] Initializing hasUnreadUpdates for task:', doc.id);
        await updateDoc(doc.ref, {
          hasUnreadUpdates: false,
        });
      }
    });
    
    await Promise.all(updatePromises);
    console.log('[taskUtils] Initialized hasUnreadUpdates for all tasks');
  } catch (error) {
    console.error('[taskUtils] Error initializing unread updates:', error);
  }
}