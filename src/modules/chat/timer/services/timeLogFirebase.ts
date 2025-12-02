/**
 * Time Log Firebase Service
 *
 * CRUD operations for time_logs subcollection and timeTracking updates.
 * Maintains backward compatibility with legacy totalHours/memberHours fields.
 *
 * Structure:
 * - tasks/{taskId}/time_logs/{logId} - Individual time log entries
 * - tasks/{taskId}.timeTracking - Summary object for quick access
 * - tasks/{taskId}.totalHours - Legacy field (kept in sync)
 * - tasks/{taskId}.memberHours - Legacy field (kept in sync)
 *
 * @module timer/services/timeLogFirebase
 */

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  runTransaction,
  Timestamp,
  serverTimestamp,
  type Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  TimeLog,
  TimeTracking,
  CreateTimeLogInput,
  TimeLogSource,
} from '../types/timer.types';
import {
  TASKS_COLLECTION_NAME,
  TIME_LOGS_COLLECTION_NAME,
  FIRESTORE_FIELDS,
} from '../utils/timerConstants';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert minutes to hours and remaining minutes
 */
function minutesToHoursAndMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

/**
 * Convert hours to minutes (for calculations)
 */
function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

// ============================================================================
// TIME LOG CRUD OPERATIONS
// ============================================================================

/**
 * Create a new time log entry and update task timeTracking
 * Also updates legacy totalHours/memberHours for backward compatibility
 *
 * @param taskId - Task ID
 * @param input - Time log input data
 * @returns Promise resolving to the created log ID
 *
 * @example
 * ```typescript
 * const logId = await createTimeLog('task123', {
 *   userId: 'user456',
 *   userName: 'Karen Ortiz',
 *   durationMinutes: 120, // 2 hours
 *   description: 'Diseño de UI',
 *   dateString: '2025-12-02',
 *   source: 'manual'
 * });
 * ```
 */
export async function createTimeLog(
  taskId: string,
  input: CreateTimeLogInput
): Promise<string> {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);
  const timeLogsRef = collection(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME);

  // Use transaction to ensure atomicity
  const logId = await runTransaction(db, async (transaction) => {
    // Get current task data
    const taskDoc = await transaction.get(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task does not exist');
    }

    const taskData = taskDoc.data();
    
    // Get current timeTracking or initialize
    const currentTimeTracking: TimeTracking = taskData.timeTracking || {
      totalHours: taskData.totalHours || 0,
      totalMinutes: 0,
      lastLogDate: null,
      memberHours: taskData.memberHours || {},
    };

    // Calculate new totals
    const currentTotalMinutes = 
      hoursToMinutes(currentTimeTracking.totalHours) + (currentTimeTracking.totalMinutes || 0);
    const newTotalMinutes = currentTotalMinutes + input.durationMinutes;
    const { hours: newTotalHours, minutes: newRemainingMinutes } = minutesToHoursAndMinutes(newTotalMinutes);

    // Update member hours
    const currentMemberMinutes = hoursToMinutes(currentTimeTracking.memberHours?.[input.userId] || 0);
    const newMemberMinutes = currentMemberMinutes + input.durationMinutes;
    const { hours: newMemberHours } = minutesToHoursAndMinutes(newMemberMinutes);

    // Create the time log document
    const newLogRef = doc(timeLogsRef);
    const timeLogData: Omit<TimeLog, 'id'> = {
      userId: input.userId,
      userName: input.userName,
      startTime: input.startTime ? Timestamp.fromDate(input.startTime) : null,
      endTime: input.endTime ? Timestamp.fromDate(input.endTime) : null,
      durationMinutes: input.durationMinutes,
      description: input.description || '',
      dateString: input.dateString,
      createdAt: serverTimestamp() as Timestamp,
      source: input.source,
    };

    // Set the time log
    transaction.set(newLogRef, timeLogData);

    // Update task with new timeTracking AND legacy fields
    const updatedMemberHours = {
      ...currentTimeTracking.memberHours,
      [input.userId]: newMemberHours,
    };

    transaction.update(taskRef, {
      // New structured timeTracking
      [FIRESTORE_FIELDS.TIME_TRACKING]: {
        totalHours: newTotalHours,
        totalMinutes: newRemainingMinutes,
        lastLogDate: serverTimestamp(),
        memberHours: updatedMemberHours,
      },
      // Legacy fields for backward compatibility
      [FIRESTORE_FIELDS.TOTAL_HOURS]: newTotalHours + (newRemainingMinutes / 60),
      [FIRESTORE_FIELDS.MEMBER_HOURS]: updatedMemberHours,
      [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
    });

    return newLogRef.id;
  });

  return logId;
}

/**
 * Get all time logs for a task
 *
 * @param taskId - Task ID
 * @param options - Query options
 * @returns Promise resolving to array of time logs
 */
export async function getTimeLogs(
  taskId: string,
  options?: {
    userId?: string;
    limit?: number;
    orderByField?: 'createdAt' | 'dateString';
    orderDirection?: 'asc' | 'desc';
  }
): Promise<TimeLog[]> {
  const timeLogsRef = collection(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME);
  
  let q = query(
    timeLogsRef,
    orderBy(options?.orderByField || 'createdAt', options?.orderDirection || 'desc')
  );

  if (options?.userId) {
    q = query(q, where(FIRESTORE_FIELDS.USER_ID, '==', options.userId));
  }

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const snapshot = await getDocs(q);
  const logs: TimeLog[] = [];

  snapshot.forEach((doc) => {
    logs.push({
      id: doc.id,
      ...doc.data(),
    } as TimeLog);
  });

  return logs;
}

/**
 * Get time logs for a specific user across a task
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @returns Promise resolving to array of user's time logs
 */
export async function getUserTimeLogs(
  taskId: string,
  userId: string
): Promise<TimeLog[]> {
  return getTimeLogs(taskId, { userId });
}

/**
 * Get a single time log by ID
 *
 * @param taskId - Task ID
 * @param logId - Time log ID
 * @returns Promise resolving to time log or null
 */
export async function getTimeLog(
  taskId: string,
  logId: string
): Promise<TimeLog | null> {
  const logRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME, logId);
  const logSnap = await getDoc(logRef);

  if (!logSnap.exists()) {
    return null;
  }

  return {
    id: logSnap.id,
    ...logSnap.data(),
  } as TimeLog;
}

/**
 * Update a time log entry (and recalculate task totals)
 *
 * @param taskId - Task ID
 * @param logId - Time log ID
 * @param updates - Partial updates
 */
export async function updateTimeLog(
  taskId: string,
  logId: string,
  updates: Partial<Pick<TimeLog, 'durationMinutes' | 'description' | 'dateString'>>
): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);
  const logRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME, logId);

  await runTransaction(db, async (transaction) => {
    const [taskDoc, logDoc] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(logRef),
    ]);

    if (!taskDoc.exists() || !logDoc.exists()) {
      throw new Error('Task or time log does not exist');
    }

    const taskData = taskDoc.data();
    const logData = logDoc.data() as TimeLog;

    // If duration changed, recalculate totals
    if (updates.durationMinutes !== undefined && updates.durationMinutes !== logData.durationMinutes) {
      const durationDiff = updates.durationMinutes - logData.durationMinutes;
      
      const currentTimeTracking: TimeTracking = taskData.timeTracking || {
        totalHours: taskData.totalHours || 0,
        totalMinutes: 0,
        lastLogDate: null,
        memberHours: taskData.memberHours || {},
      };

      const currentTotalMinutes = 
        hoursToMinutes(currentTimeTracking.totalHours) + (currentTimeTracking.totalMinutes || 0);
      const newTotalMinutes = currentTotalMinutes + durationDiff;
      const { hours: newTotalHours, minutes: newRemainingMinutes } = minutesToHoursAndMinutes(newTotalMinutes);

      // Update member hours
      const currentMemberMinutes = hoursToMinutes(currentTimeTracking.memberHours?.[logData.userId] || 0);
      const newMemberMinutes = Math.max(0, currentMemberMinutes + durationDiff);
      const { hours: newMemberHours } = minutesToHoursAndMinutes(newMemberMinutes);

      const updatedMemberHours = {
        ...currentTimeTracking.memberHours,
        [logData.userId]: newMemberHours,
      };

      transaction.update(taskRef, {
        [FIRESTORE_FIELDS.TIME_TRACKING]: {
          totalHours: newTotalHours,
          totalMinutes: newRemainingMinutes,
          lastLogDate: currentTimeTracking.lastLogDate,
          memberHours: updatedMemberHours,
        },
        [FIRESTORE_FIELDS.TOTAL_HOURS]: newTotalHours + (newRemainingMinutes / 60),
        [FIRESTORE_FIELDS.MEMBER_HOURS]: updatedMemberHours,
        [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
      });
    }

    // Update the log itself
    transaction.update(logRef, {
      ...updates,
    });
  });
}

/**
 * Delete a time log entry (and recalculate task totals)
 *
 * @param taskId - Task ID
 * @param logId - Time log ID
 */
export async function deleteTimeLog(
  taskId: string,
  logId: string
): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);
  const logRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME, logId);

  await runTransaction(db, async (transaction) => {
    const [taskDoc, logDoc] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(logRef),
    ]);

    if (!taskDoc.exists()) {
      throw new Error('Task does not exist');
    }

    if (!logDoc.exists()) {
      // Log already deleted, nothing to do
      return;
    }

    const taskData = taskDoc.data();
    const logData = logDoc.data() as TimeLog;

    // Recalculate totals
    const currentTimeTracking: TimeTracking = taskData.timeTracking || {
      totalHours: taskData.totalHours || 0,
      totalMinutes: 0,
      lastLogDate: null,
      memberHours: taskData.memberHours || {},
    };

    const currentTotalMinutes = 
      hoursToMinutes(currentTimeTracking.totalHours) + (currentTimeTracking.totalMinutes || 0);
    const newTotalMinutes = Math.max(0, currentTotalMinutes - logData.durationMinutes);
    const { hours: newTotalHours, minutes: newRemainingMinutes } = minutesToHoursAndMinutes(newTotalMinutes);

    // Update member hours
    const currentMemberMinutes = hoursToMinutes(currentTimeTracking.memberHours?.[logData.userId] || 0);
    const newMemberMinutes = Math.max(0, currentMemberMinutes - logData.durationMinutes);
    const { hours: newMemberHours } = minutesToHoursAndMinutes(newMemberMinutes);

    const updatedMemberHours = {
      ...currentTimeTracking.memberHours,
      [logData.userId]: newMemberHours,
    };

    // Delete the log
    transaction.delete(logRef);

    // Update task totals
    transaction.update(taskRef, {
      [FIRESTORE_FIELDS.TIME_TRACKING]: {
        totalHours: newTotalHours,
        totalMinutes: newRemainingMinutes,
        lastLogDate: currentTimeTracking.lastLogDate,
        memberHours: updatedMemberHours,
      },
      [FIRESTORE_FIELDS.TOTAL_HOURS]: newTotalHours + (newRemainingMinutes / 60),
      [FIRESTORE_FIELDS.MEMBER_HOURS]: updatedMemberHours,
      [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
    });
  });
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

/**
 * Listen to time logs for a task in real-time
 *
 * @param taskId - Task ID
 * @param callback - Callback with time logs array
 * @returns Unsubscribe function
 */
export function listenToTimeLogs(
  taskId: string,
  callback: (logs: TimeLog[]) => void
): Unsubscribe {
  const timeLogsRef = collection(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME);
  const q = query(timeLogsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const logs: TimeLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      } as TimeLog);
    });
    callback(logs);
  });
}

/**
 * Listen to timeTracking summary for a task
 *
 * @param taskId - Task ID
 * @param callback - Callback with timeTracking data
 * @returns Unsubscribe function
 */
export function listenToTimeTracking(
  taskId: string,
  callback: (tracking: TimeTracking | null) => void
): Unsubscribe {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

  return onSnapshot(taskRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data();
    
    // Return timeTracking or build from legacy fields
    if (data.timeTracking) {
      callback(data.timeTracking as TimeTracking);
    } else if (data.totalHours !== undefined) {
      // Legacy fallback
      callback({
        totalHours: data.totalHours || 0,
        totalMinutes: 0,
        lastLogDate: null,
        memberHours: data.memberHours || {},
      });
    } else {
      callback(null);
    }
  });
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrate legacy chat messages with hours to time_logs subcollection
 * This is a one-time migration helper
 *
 * @param taskId - Task ID
 * @returns Promise resolving to number of migrated logs
 */
export async function migrateLegacyTimeLogs(taskId: string): Promise<number> {
  const messagesRef = collection(db, TASKS_COLLECTION_NAME, taskId, 'messages');
  const q = query(messagesRef, where('hours', '>', 0));
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return 0;
  }

  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach((msgDoc) => {
    const data = msgDoc.data();
    
    // Create time_log from legacy message
    const timeLogRef = doc(collection(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME));
    
    batch.set(timeLogRef, {
      userId: data.senderId,
      userName: data.senderName || 'Usuario',
      startTime: null,
      endTime: null,
      durationMinutes: Math.round((data.hours || 0) * 60),
      description: data.text || '',
      dateString: data.dateString || new Date().toISOString().split('T')[0],
      createdAt: data.timestamp || serverTimestamp(),
      source: 'legacy' as TimeLogSource,
    });
    
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return count;
}

/**
 * Recalculate timeTracking from time_logs subcollection
 * Useful after migration or to fix inconsistencies
 *
 * @param taskId - Task ID
 */
export async function recalculateTimeTracking(taskId: string): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);
  const timeLogsRef = collection(db, TASKS_COLLECTION_NAME, taskId, TIME_LOGS_COLLECTION_NAME);
  
  const snapshot = await getDocs(timeLogsRef);
  
  let totalMinutes = 0;
  const memberMinutes: Record<string, number> = {};
  let lastLogDate: Timestamp | null = null;

  snapshot.forEach((doc) => {
    const data = doc.data() as TimeLog;
    totalMinutes += data.durationMinutes || 0;
    
    if (data.userId) {
      memberMinutes[data.userId] = (memberMinutes[data.userId] || 0) + (data.durationMinutes || 0);
    }
    
    if (data.createdAt && (!lastLogDate || data.createdAt.toMillis() > lastLogDate.toMillis())) {
      lastLogDate = data.createdAt;
    }
  });

  const { hours: totalHours, minutes: remainingMinutes } = minutesToHoursAndMinutes(totalMinutes);
  
  // Convert member minutes to hours
  const memberHours: Record<string, number> = {};
  for (const [userId, minutes] of Object.entries(memberMinutes)) {
    const { hours } = minutesToHoursAndMinutes(minutes);
    memberHours[userId] = hours;
  }

  await updateDoc(taskRef, {
    [FIRESTORE_FIELDS.TIME_TRACKING]: {
      totalHours,
      totalMinutes: remainingMinutes,
      lastLogDate,
      memberHours,
    },
    [FIRESTORE_FIELDS.TOTAL_HOURS]: totalHours + (remainingMinutes / 60),
    [FIRESTORE_FIELDS.MEMBER_HOURS]: memberHours,
    [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimeLogFirebaseService = {
  // CRUD
  createTimeLog,
  getTimeLogs,
  getUserTimeLogs,
  getTimeLog,
  updateTimeLog,
  deleteTimeLog,

  // Listeners
  listenToTimeLogs,
  listenToTimeTracking,

  // Migration
  migrateLegacyTimeLogs,
  recalculateTimeTracking,

  // Helpers
  minutesToHoursAndMinutes,
  hoursToMinutes,
} as const;
