/**
 * Task Utils - CLIENT SAFE
 *
 * Utility functions that can be used in both client and server.
 * NO server-only dependencies (no mailer, no nodemailer, etc.)
 */

import { db } from './firebase';
import { collection, getDocs, query, doc, where, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';

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

interface TaskWithActivity {
  lastActivity?: Timestamp | string;
  createdAt: Timestamp | string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: Timestamp | string };
}

// Cache para debouncing de actualizaciones de actividad
const activityUpdateCache = new Map<string, { timeout: NodeJS.Timeout; lastUpdate: number }>();
const ACTIVITY_DEBOUNCE_DELAY = 5000; // 5 segundos

// Función para actualizar la actividad de una tarea con debouncing
export async function updateTaskActivity(taskId: string, activityType: 'message' | 'status_change' | 'edit' | 'time_entry') {
  try {
    // Limpiar timeout anterior si existe
    if (activityUpdateCache.has(taskId)) {
      clearTimeout(activityUpdateCache.get(taskId)!.timeout);
    }

    // Crear nuevo timeout para debouncing
    const timeout = setTimeout(async () => {
      try {
        const now = Timestamp.now();
        await updateDoc(doc(db, 'tasks', taskId), {
          lastActivity: now,
          hasUnreadUpdates: true,
        });
        debugLog('[taskUtils] Task activity updated:', { taskId, activityType, timestamp: now });

        // Limpiar del cache después de la actualización
        activityUpdateCache.delete(taskId);
      } catch (error) {
        debugError('[taskUtils] Error updating task activity:', error);
        activityUpdateCache.delete(taskId);
      }
    }, ACTIVITY_DEBOUNCE_DELAY);

    // Guardar en cache
    activityUpdateCache.set(taskId, { timeout, lastUpdate: Date.now() });
  } catch (error) {
    debugError('[taskUtils] Error setting up activity update:', error);
  }
}

// Función para forzar actualización inmediata (para casos críticos)
export async function forceUpdateTaskActivity(taskId: string, activityType: 'message' | 'status_change' | 'edit' | 'time_entry') {
  try {
    // Limpiar timeout si existe
    if (activityUpdateCache.has(taskId)) {
      clearTimeout(activityUpdateCache.get(taskId)!.timeout);
      activityUpdateCache.delete(taskId);
    }

    const now = Timestamp.now();
    await updateDoc(doc(db, 'tasks', taskId), {
      lastActivity: now,
      hasUnreadUpdates: true,
    });
    debugLog('[taskUtils] Task activity force updated:', { taskId, activityType, timestamp: now });
  } catch (error) {
    debugError('[taskUtils] Error force updating task activity:', error);
  }
}

// Función para limpiar cache de actividad (útil para testing)
export function clearActivityCache() {
  activityUpdateCache.forEach(({ timeout }) => clearTimeout(timeout));
  activityUpdateCache.clear();
}

// Función para obtener estadísticas de cache
export function getActivityCacheStats() {
  return {
    pendingUpdates: activityUpdateCache.size,
    cacheEntries: Array.from(activityUpdateCache.entries()).map(([taskId, { lastUpdate }]) => ({
      taskId,
      lastUpdate: new Date(lastUpdate),
      timeSinceUpdate: Date.now() - lastUpdate,
    })),
  };
}

// Función para marcar una tarea como vista por un usuario (estilo red social)
export async function markTaskAsViewed(taskId: string, userId: string) {
  try {
    const now = Timestamp.now();

    // Actualizar el timestamp de última vista para este usuario específico
    await updateDoc(doc(db, 'tasks', taskId), {
      [`lastViewedBy.${userId}`]: now,
    });
  } catch (error) {
    debugError('[taskUtils] Error marking task as viewed:', error);
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
  // Si no hay userId, no hay notificaciones
  if (!userId) {
    return 0;
  }

  // Si la tarea no tiene actualizaciones, no hay notificaciones
  if (!task.hasUnreadUpdates) {
    return 0;
  }

  // Si el usuario nunca ha visto la tarea, tiene 1 notificación
  if (!task.lastViewedBy || !task.lastViewedBy[userId]) {
    return 1;
  }

  // Si hay última actividad y es más reciente que la última vista
  if (task.lastActivity) {
    const lastActivity = task.lastActivity instanceof Timestamp
      ? task.lastActivity.toMillis()
      : new Date(task.lastActivity).getTime();

    const lastViewed = task.lastViewedBy[userId] instanceof Timestamp
      ? (task.lastViewedBy[userId] as Timestamp).toMillis()
      : new Date(task.lastViewedBy[userId] as string).getTime();

    if (lastActivity > lastViewed) {
      return 1; // Una notificación por tarea no vista
    }
  }

  return 0;
}

// Función simple para verificar si hay notificaciones
export function hasUnreadUpdates(task: TaskWithActivity, userId: string): boolean {
  return getUnreadCount(task, userId) > 0;
}

// Función para inicializar hasUnreadUpdates en tareas existentes
export async function initializeUnreadUpdates() {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const tasksSnapshot = await getDocs(tasksQuery);

    const updatePromises = tasksSnapshot.docs.map(async (doc) => {
      const taskData = doc.data();
      if (taskData.hasUnreadUpdates === undefined) {
        debugLog('[taskUtils] Initializing hasUnreadUpdates for task:', doc.id);
        await updateDoc(doc.ref, {
          hasUnreadUpdates: false,
        });
      }
    });

    await Promise.all(updatePromises);
    debugLog('[taskUtils] Initialized hasUnreadUpdates for all tasks');
  } catch (error) {
    debugError('[taskUtils] Error initializing unread updates:', error);
  }
}

// Función para limpiar status corruptos (IDs random) en la base de datos
export async function cleanCorruptStatuses() {
  try {
    debugLog('[taskUtils] Starting cleanup of corrupt statuses...');

    const tasksQuery = query(collection(db, 'tasks'));
    const snapshot = await getDocs(tasksQuery);

    const batch = writeBatch(db);
    let cleanedCount = 0;
    let totalTasks = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status;
      totalTasks++;

      // Detectar si es un ID random (base64-like string de ~20+ caracteres)
      if (status && /^[A-Za-z0-9+/=]{20,}$/.test(status)) {
        batch.update(docSnap.ref, { status: 'Por Iniciar' });
        cleanedCount++;
        debugLog('[taskUtils] Cleaning status for task:', {
          taskId: docSnap.id,
          taskName: data.name || 'Unknown',
          oldStatus: status,
          newStatus: 'Por Iniciar'
        });
      }
    });

    if (cleanedCount > 0) {
      await batch.commit();
      debugLog(`[taskUtils] Cleanup complete: ${cleanedCount} corrupt statuses fixed out of ${totalTasks} total tasks`);
    } else {
      debugLog(`[taskUtils] No corrupt statuses found in ${totalTasks} tasks`);
    }

    return { cleanedCount, totalTasks };
  } catch (error) {
    debugError('[taskUtils] Error cleaning corrupt statuses:', error);
    throw new Error(`Failed to clean corrupt statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Función para obtener estadísticas de status corruptos (sin modificar)
export async function getCorruptStatusStats() {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const snapshot = await getDocs(tasksQuery);

    let totalTasks = 0;
    let corruptTasks = 0;
    const corruptExamples: Array<{ id: string; name: string; status: string }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status;
      totalTasks++;

      if (status && /^[A-Za-z0-9+/=]{20,}$/.test(status)) {
        corruptTasks++;
        if (corruptExamples.length < 5) { // Solo mostrar primeros 5 ejemplos
          corruptExamples.push({
            id: docSnap.id,
            name: data.name || 'Unknown',
            status: status
          });
        }
      }
    });

    debugLog('[taskUtils] Corrupt status statistics:', {
      totalTasks,
      corruptTasks,
      percentage: totalTasks > 0 ? ((corruptTasks / totalTasks) * 100).toFixed(2) + '%' : '0%',
      examples: corruptExamples
    });

    return { totalTasks, corruptTasks, corruptExamples };
  } catch (error) {
    debugError('[taskUtils] Error getting corrupt status stats:', error);
    throw new Error(`Failed to get corrupt status stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Función para limpiar status que son Objects en lugar de strings
export async function cleanObjectStatuses() {
  try {
    debugLog('[taskUtils] Starting cleanup of Object statuses...');

    const tasksQuery = query(collection(db, 'tasks'));
    const snapshot = await getDocs(tasksQuery);

    const batch = writeBatch(db);
    let cleanedCount = 0;
    let totalTasks = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status;
      totalTasks++;

      // Detectar si el status es un Object en lugar de string
      if (status && typeof status === 'object' && status !== null) {
        batch.update(docSnap.ref, { status: 'Por Iniciar' });
        cleanedCount++;
        debugLog('[taskUtils] Cleaning Object status for task:', {
          taskId: docSnap.id,
          taskName: data.name || 'Unknown',
          oldStatus: status,
          statusType: typeof status,
          newStatus: 'Por Iniciar'
        });
      }
    });

    if (cleanedCount > 0) {
      await batch.commit();
      debugLog(`[taskUtils] Object status cleanup complete: ${cleanedCount} Object statuses fixed out of ${totalTasks} total tasks`);
    } else {
      debugLog(`[taskUtils] No Object statuses found in ${totalTasks} tasks`);
    }

    return { cleanedCount, totalTasks };
  } catch (error) {
    debugError('[taskUtils] Error cleaning Object statuses:', error);
    throw new Error(`Failed to clean Object statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
