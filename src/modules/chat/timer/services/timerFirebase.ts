/**
 * Timer Module - Firebase Service
 *
 * All Firestore CRUD operations for timers.
 * Handles batch writes, transactions, and real-time listeners.
 *
 * @module timer/services/firebase
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TimerDocument, TimerInterval, FirestoreTimerInterval } from '../types/timer.types';
import { TimerStatus } from '../types/timer.types';
import {
  TIMER_COLLECTION_NAME,
  TASKS_COLLECTION_NAME,
  FIRESTORE_FIELDS,
  ERROR_MESSAGES,
} from '../utils/timerConstants';
import { timerCache } from './timerCache';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique device ID for this browser/session
 * Used to identify which device made changes for multi-device sync
 *
 * @returns Device ID string
 */
export function generateDeviceId(): string {
  // Try to get existing device ID from sessionStorage
  if (typeof window !== 'undefined') {
    const existingId = sessionStorage.getItem('timer-device-id');
    if (existingId) return existingId;

    // Generate new ID
    const deviceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    sessionStorage.setItem('timer-device-id', deviceId);
    return deviceId;
  }

  // Fallback for server-side
  return `device-server-${Date.now()}`;
}

/**
 * Convert TimerInterval to Firestore format with Timestamps
 *
 * @param interval - Timer interval with Date objects
 * @returns Firestore interval with Timestamps
 */
function convertIntervalToFirestore(interval: TimerInterval): FirestoreTimerInterval {
  return {
    start: Timestamp.fromDate(interval.start),
    end: Timestamp.fromDate(interval.end),
    duration: interval.duration,
  };
}

/**
 * Convert Firestore interval to local format with Dates
 *
 * @param interval - Firestore interval with Timestamps
 * @returns Timer interval with Date objects
 */
function convertIntervalFromFirestore(interval: FirestoreTimerInterval): TimerInterval {
  return {
    start: interval.start.toDate(),
    end: interval.end.toDate(),
    duration: interval.duration,
  };
}

// ============================================================================
// TIMER CRUD OPERATIONS
// ============================================================================

/**
 * Create a new timer document in Firestore
 * Uses subcollection structure: tasks/{taskId}/timers/{userId}
 *
 * @param userId - User ID who owns the timer
 * @param taskId - Task ID this timer is associated with
 * @returns Promise resolving to the created timer ID (userId)
 *
 * @example
 * ```typescript
 * const timerId = await createTimer('user123', 'task456');
 * console.log('Created timer:', timerId);
 * ```
 */
export async function createTimer(userId: string, taskId: string): Promise<string> {
  // Use subcollection structure: tasks/{taskId}/timers/{userId}
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);

  const timerData: Omit<TimerDocument, 'id'> = {
    userId,
    taskId,
    status: TimerStatus.IDLE,
    startedAt: null,
    pausedAt: null,
    totalSeconds: 0,
    intervals: [],
    deviceId: generateDeviceId(),
    lastSync: serverTimestamp() as Timestamp,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(timerRef, timerData);

  console.log(`[TimerFirebase] Created timer: tasks/${taskId}/timers/${userId}`);
  return userId;
}

/**
 * Get a timer document from Firestore
 * Uses subcollection structure: tasks/{taskId}/timers/{userId}
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @returns Promise resolving to timer document or null if not found
 *
 * @example
 * ```typescript
 * const timer = await getTimer('task456', 'user123');
 * if (timer) {
 *   console.log('Timer status:', timer.status);
 * }
 * ```
 */
export async function getTimer(taskId: string, userId: string): Promise<TimerDocument | null> {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);
  const timerSnap = await getDoc(timerRef);

  if (!timerSnap.exists()) {
    return null;
  }

  const data = timerSnap.data() as Omit<TimerDocument, 'id'>;
  return {
    id: timerSnap.id,
    ...data,
  };
}

/**
 * Update a timer document in Firestore
 * Uses subcollection structure: tasks/{taskId}/timers/{userId}
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param data - Partial timer data to update
 *
 * @example
 * ```typescript
 * await updateTimer('task123', 'user456', {
 *   status: TimerStatus.PAUSED,
 *   pausedAt: Timestamp.now()
 * });
 * ```
 */
export async function updateTimer(
  taskId: string,
  userId: string,
  data: Partial<Omit<TimerDocument, 'id'>>
): Promise<void> {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);

  await updateDoc(timerRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  console.log(`[TimerFirebase] Updated timer: tasks/${taskId}/timers/${userId}`);
}

/**
 * Delete a timer document from Firestore
 * Uses subcollection structure: tasks/{taskId}/timers/{userId}
 *
 * @param taskId - Task ID
 * @param userId - User ID
 *
 * @example
 * ```typescript
 * await deleteTimer('task123', 'user456');
 * console.log('Timer deleted');
 * ```
 */
export async function deleteTimer(taskId: string, userId: string): Promise<void> {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);
  await deleteDoc(timerRef);

  // Also invalidate cache
  timerCache.invalidate(userId);

  console.log(`[TimerFirebase] Deleted timer: tasks/${taskId}/timers/${userId}`);
}

// ============================================================================
// TIMER STATE OPERATIONS
// ============================================================================

/**
 * Start a timer in Firestore
 * Sets status to running and records start time
 *
 * @param taskId - Task ID
 * @param userId - User ID
 *
 * @example
 * ```typescript
 * await startTimerInFirestore('task123', 'user456');
 * console.log('Timer started');
 * ```
 */
export async function startTimerInFirestore(taskId: string, userId: string): Promise<void> {
  await updateTimer(taskId, userId, {
    status: TimerStatus.RUNNING,
    startedAt: serverTimestamp() as Timestamp,
    pausedAt: null,
    lastSync: serverTimestamp() as Timestamp,
    deviceId: generateDeviceId(),
  });

  console.log(`[TimerFirebase] Started timer: tasks/${taskId}/timers/${userId}`);
}

/**
 * Pause a timer in Firestore
 * Records the interval and updates total seconds
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param interval - Interval to add
 *
 * @example
 * ```typescript
 * const interval = {
 *   start: new Date('2025-01-01T10:00:00'),
 *   end: new Date('2025-01-01T11:00:00'),
 *   duration: 3600
 * };
 * await pauseTimerInFirestore('task123', 'user456', interval);
 * ```
 */
export async function pauseTimerInFirestore(
  taskId: string,
  userId: string,
  interval: TimerInterval
): Promise<void> {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);
  const firestoreInterval = convertIntervalToFirestore(interval);

  await updateDoc(timerRef, {
    [FIRESTORE_FIELDS.STATUS]: TimerStatus.PAUSED,
    [FIRESTORE_FIELDS.PAUSED_AT]: serverTimestamp(),
    [FIRESTORE_FIELDS.INTERVALS]: arrayUnion(firestoreInterval),
    [FIRESTORE_FIELDS.TOTAL_SECONDS]: increment(interval.duration),
    [FIRESTORE_FIELDS.LAST_SYNC]: serverTimestamp(),
    [FIRESTORE_FIELDS.UPDATED_AT]: serverTimestamp(),
    [FIRESTORE_FIELDS.DEVICE_ID]: generateDeviceId(),
  });

  console.log(`[TimerFirebase] Paused timer: tasks/${taskId}/timers/${userId}, duration: ${interval.duration}s`);
}

/**
 * Stop a timer in Firestore and update task aggregates
 * This is a two-step operation that should ideally be batched
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param finalInterval - Final interval if timer was running
 *
 * @example
 * ```typescript
 * const finalInterval = {
 *   start: new Date('2025-01-01T10:00:00'),
 *   end: new Date('2025-01-01T11:00:00'),
 *   duration: 3600
 * };
 * await stopTimerInFirestore('task123', 'user456', finalInterval);
 * ```
 */
export async function stopTimerInFirestore(
  taskId: string,
  userId: string,
  finalInterval: TimerInterval
): Promise<void> {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);
  const timerSnap = await getDoc(timerRef);

  if (!timerSnap.exists()) {
    throw new Error(ERROR_MESSAGES.TIMER_NOT_FOUND);
  }

  const currentData = timerSnap.data() as Omit<TimerDocument, 'id'>;
  const firestoreInterval = convertIntervalToFirestore(finalInterval);
  const finalSeconds = currentData.totalSeconds + finalInterval.duration;

  // Update timer
  await updateDoc(timerRef, {
    [FIRESTORE_FIELDS.STATUS]: TimerStatus.STOPPED,
    [FIRESTORE_FIELDS.INTERVALS]: arrayUnion(firestoreInterval),
    [FIRESTORE_FIELDS.TOTAL_SECONDS]: finalSeconds,
    [FIRESTORE_FIELDS.LAST_SYNC]: serverTimestamp(),
    [FIRESTORE_FIELDS.UPDATED_AT]: serverTimestamp(),
    [FIRESTORE_FIELDS.DEVICE_ID]: generateDeviceId(),
  });

  // Update task aggregates
  await updateTaskAggregates(taskId, userId, finalSeconds);

  console.log(`[TimerFirebase] Stopped timer: tasks/${taskId}/timers/${userId}, total: ${finalSeconds}s`);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Update task aggregate hours (totalHours and memberHours)
 * Also updates new timeTracking field for compatibility
 * Uses transaction for accurate read-modify-write
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param seconds - Seconds to add (will be converted to hours)
 *
 * @example
 * ```typescript
 * await updateTaskAggregates('task123', 'user456', 3600); // Add 1 hour
 * ```
 */
export async function updateTaskAggregates(
  taskId: string,
  userId: string,
  seconds: number
): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

  await runTransaction(db, async (transaction) => {
    const taskDoc = await transaction.get(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task does not exist');
    }

    const taskData = taskDoc.data();
    const minutesToAdd = Math.round(seconds / 60);
    const hoursToAdd = seconds / 3600;

    // Get current timeTracking or initialize from legacy fields
    const currentTimeTracking = taskData.timeTracking || {
      totalHours: taskData.totalHours || 0,
      totalMinutes: 0,
      lastLogDate: null,
      memberHours: taskData.memberHours || {},
    };

    // Calculate new totals
    const currentTotalMinutes = 
      Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
    const newTotalMinutes = currentTotalMinutes + minutesToAdd;
    const newTotalHours = Math.floor(newTotalMinutes / 60);
    const newRemainingMinutes = newTotalMinutes % 60;

    // Update member hours
    const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
    const newMemberHours = currentMemberHours + hoursToAdd;

    const updatedMemberHours = {
      ...currentTimeTracking.memberHours,
      [userId]: newMemberHours,
    };

    transaction.update(taskRef, {
      // New timeTracking structure
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
  });
}

/**
 * Stop timer and update task in a single atomic batch operation
 * Preferred over separate stopTimer + updateTaskAggregates calls
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param interval - Final interval
 *
 * @example
 * ```typescript
 * await batchStopTimer('task456', 'user789', finalInterval);
 * ```
 */
export async function batchStopTimer(
  taskId: string,
  userId: string,
  interval: TimerInterval
): Promise<void> {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

  await runTransaction(db, async (transaction) => {
    // Get current timer and task data
    const [timerSnap, taskDoc] = await Promise.all([
      transaction.get(timerRef),
      transaction.get(taskRef),
    ]);

    if (!timerSnap.exists()) {
      throw new Error(ERROR_MESSAGES.TIMER_NOT_FOUND);
    }

    if (!taskDoc.exists()) {
      throw new Error('Task does not exist');
    }

    const currentData = timerSnap.data() as Omit<TimerDocument, 'id'>;
    const taskData = taskDoc.data();
    const firestoreInterval = convertIntervalToFirestore(interval);
    const finalSeconds = currentData.totalSeconds + interval.duration;
    const minutesToAdd = Math.round(finalSeconds / 60);
    const hoursToAdd = finalSeconds / 3600;

    // Get current timeTracking or initialize from legacy fields
    const currentTimeTracking = taskData.timeTracking || {
      totalHours: taskData.totalHours || 0,
      totalMinutes: 0,
      lastLogDate: null,
      memberHours: taskData.memberHours || {},
    };

    // Calculate new totals
    const currentTotalMinutes = 
      Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
    const newTotalMinutes = currentTotalMinutes + minutesToAdd;
    const newTotalHours = Math.floor(newTotalMinutes / 60);
    const newRemainingMinutes = newTotalMinutes % 60;

    // Update member hours
    const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
    const newMemberHours = currentMemberHours + hoursToAdd;

    const updatedMemberHours = {
      ...currentTimeTracking.memberHours,
      [userId]: newMemberHours,
    };

    // Update timer
    transaction.update(timerRef, {
      [FIRESTORE_FIELDS.STATUS]: TimerStatus.STOPPED,
      [FIRESTORE_FIELDS.INTERVALS]: arrayUnion(firestoreInterval),
      [FIRESTORE_FIELDS.TOTAL_SECONDS]: finalSeconds,
      [FIRESTORE_FIELDS.LAST_SYNC]: serverTimestamp(),
      [FIRESTORE_FIELDS.UPDATED_AT]: serverTimestamp(),
      [FIRESTORE_FIELDS.DEVICE_ID]: generateDeviceId(),
    });

    // Update task with both timeTracking and legacy fields
    transaction.update(taskRef, {
      // New timeTracking structure
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
  });
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

/**
 * Add time to a task using a transaction
 * Also updates new timeTracking field for compatibility
 * Ensures atomic read-modify-write for concurrent access safety
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param seconds - Seconds to add
 *
 * @example
 * ```typescript
 * await addTimeToTaskTransaction('task123', 'user456', 7200); // Add 2 hours
 * ```
 */
export async function addTimeToTaskTransaction(
  taskId: string,
  userId: string,
  seconds: number
): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

  await runTransaction(db, async (transaction) => {
    const taskDoc = await transaction.get(taskRef);

    if (!taskDoc.exists()) {
      throw new Error('Task does not exist');
    }

    const taskData = taskDoc.data();
    const minutesToAdd = Math.round(seconds / 60);
    const hoursToAdd = seconds / 3600;

    // Get current timeTracking or initialize from legacy fields
    const currentTimeTracking = taskData.timeTracking || {
      totalHours: taskData.totalHours || 0,
      totalMinutes: 0,
      lastLogDate: null,
      memberHours: taskData.memberHours || {},
    };

    // Calculate new totals
    const currentTotalMinutes = 
      Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
    const newTotalMinutes = currentTotalMinutes + minutesToAdd;
    const newTotalHours = Math.floor(newTotalMinutes / 60);
    const newRemainingMinutes = newTotalMinutes % 60;

    // Update member hours
    const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
    const newMemberHours = currentMemberHours + hoursToAdd;

    const updatedMemberHours = {
      ...currentTimeTracking.memberHours,
      [userId]: newMemberHours,
    };

    transaction.update(taskRef, {
      // New timeTracking structure
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
  });
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

/**
 * Listen to real-time updates for a specific timer
 * Returns unsubscribe function to stop listening
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param callback - Callback function called on updates
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = listenToTimer('task123', 'user456', (timer) => {
 *   if (timer) {
 *     console.log('Timer updated:', timer.status);
 *   }
 * });
 *
 * // Later: stop listening
 * unsubscribe();
 * ```
 */
export function listenToTimer(
  taskId: string,
  userId: string,
  callback: (data: TimerDocument | null) => void
): Unsubscribe {
  const timerRef = doc(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME, userId);

  const unsubscribe = onSnapshot(
    timerRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data() as Omit<TimerDocument, 'id'>;
      const timerDoc: TimerDocument = {
        id: snapshot.id,
        ...data,
      };

      const hasPendingWrites = snapshot.metadata.hasPendingWrites;

      // Update cache
      timerCache.set(userId, timerDoc, hasPendingWrites);

      callback(timerDoc);
    },
    (error) => {
      console.error('[TimerFirebase] Error listening to timer:', error);
      callback(null);
    }
  );

  return unsubscribe;
}

/**
 * Listen to all timers for a specific task
 * Useful for showing all active timers on a task
 * Uses subcollection structure: tasks/{taskId}/timers
 *
 * @param taskId - Task ID
 * @param callback - Callback function called with array of timers
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = listenToTaskTimers('task123', (timers) => {
 *   console.log(`Task has ${timers.length} active timers`);
 * });
 * ```
 */
export function listenToTaskTimers(
  taskId: string,
  callback: (timers: TimerDocument[]) => void
): Unsubscribe {
  // Use subcollection query
  const timersCollectionRef = collection(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME);

  const unsubscribe = onSnapshot(
    timersCollectionRef,
    (snapshot) => {
      const timers: TimerDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<TimerDocument, 'id'>;
        timers.push({
          id: doc.id,
          ...data,
        });
      });
      callback(timers);
    },
    (error) => {
      console.error('[TimerFirebase] Error listening to task timers:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get all active (running) timers for a task
 * Uses subcollection structure: tasks/{taskId}/timers
 *
 * @param taskId - Task ID
 * @returns Promise resolving to array of active timers
 *
 * @example
 * ```typescript
 * const activeTimers = await getActiveTimersForTask('task123');
 * console.log(`Found ${activeTimers.length} running timers`);
 * ```
 */
export async function getActiveTimersForTask(taskId: string): Promise<TimerDocument[]> {
  // Query the subcollection
  const timersCollectionRef = collection(db, TASKS_COLLECTION_NAME, taskId, TIMER_COLLECTION_NAME);
  const q = query(
    timersCollectionRef,
    where(FIRESTORE_FIELDS.STATUS, '==', TimerStatus.RUNNING)
  );

  const snapshot = await getDocs(q);
  const timers: TimerDocument[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as Omit<TimerDocument, 'id'>;
    timers.push({
      id: doc.id,
      ...data,
    });
  });

  return timers;
}

/**
 * Get a specific user's timer for a task
 * Uses subcollection structure: tasks/{taskId}/timers/{userId}
 *
 * @param userId - User ID
 * @param taskId - Task ID
 * @returns Promise resolving to timer or null
 *
 * @example
 * ```typescript
 * const userTimer = await getUserTimerForTask('user123', 'task456');
 * if (userTimer) {
 *   console.log('User has a timer:', userTimer.status);
 * }
 * ```
 */
export async function getUserTimerForTask(
  userId: string,
  taskId: string
): Promise<TimerDocument | null> {
  // Directly access the user's timer document in the subcollection
  return await getTimer(taskId, userId);
}

/**
 * Get all timers for a user across all tasks
 * NOTE: This requires collection group query which may be less efficient
 * Consider using getUserTimerForTask for specific tasks instead
 *
 * @param userId - User ID
 * @returns Promise resolving to array of timers
 *
 * @example
 * ```typescript
 * const userTimers = await getAllUserTimers('user123');
 * console.log(`User has ${userTimers.length} total timers`);
 * ```
 */
export async function getAllUserTimers(userId: string): Promise<TimerDocument[]> {
  // Use collection group query to search across all task subcollections
  const timersQuery = query(
    collection(db, TIMER_COLLECTION_NAME),
    where(FIRESTORE_FIELDS.USER_ID, '==', userId)
  );

  const snapshot = await getDocs(timersQuery);
  const timers: TimerDocument[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as Omit<TimerDocument, 'id'>;
    timers.push({
      id: doc.id,
      ...data,
    });
  });

  return timers;
}

/**
 * Get all active (RUNNING or PAUSED) timers for a user across all their tasks
 * Uses the user's assigned tasks to fetch timers efficiently
 *
 * @param userId - User ID
 * @param userTaskIds - Array of task IDs the user has access to
 * @returns Promise resolving to array of active timers
 *
 * @example
 * ```typescript
 * const activeTimers = await getUserActiveTimers('user123', ['task1', 'task2']);
 * console.log(`User has ${activeTimers.length} active timers`);
 * ```
 */
export async function getUserActiveTimers(
  userId: string,
  userTaskIds: string[]
): Promise<TimerDocument[]> {
  if (!userTaskIds.length) {
    return [];
  }

  console.log(`[TimerFirebase] Fetching active timers for user ${userId} across ${userTaskIds.length} tasks`);

  // Fetch timers in parallel for all user tasks
  const timerPromises = userTaskIds.map(async (taskId) => {
    try {
      const timer = await getTimer(taskId, userId);
      // Only return if timer exists and is active (RUNNING or PAUSED)
      if (timer && (timer.status === TimerStatus.RUNNING || timer.status === TimerStatus.PAUSED)) {
        return timer;
      }
      return null;
    } catch (error) {
      console.warn(`[TimerFirebase] Error fetching timer for task ${taskId}:`, error);
      return null;
    }
  });

  const results = await Promise.all(timerPromises);
  const activeTimers = results.filter((timer): timer is TimerDocument => timer !== null);

  console.log(`[TimerFirebase] Found ${activeTimers.length} active timers`);
  return activeTimers;
}

/**
 * Listen to all active timers for a user
 * Sets up listeners for each task and returns a cleanup function
 *
 * @param userId - User ID
 * @param userTaskIds - Array of task IDs the user has access to
 * @param callback - Callback function called when any timer changes
 * @returns Unsubscribe function to stop all listeners
 */
export function listenToUserTimers(
  userId: string,
  userTaskIds: string[],
  callback: (timers: TimerDocument[]) => void
): Unsubscribe {
  const timersMap = new Map<string, TimerDocument>();
  const unsubscribers: Unsubscribe[] = [];

  // Set up a listener for each task
  for (const taskId of userTaskIds) {
    const unsubscribe = listenToTimer(taskId, userId, (timer) => {
      if (timer && (timer.status === TimerStatus.RUNNING || timer.status === TimerStatus.PAUSED)) {
        timersMap.set(taskId, timer);
      } else {
        timersMap.delete(taskId);
      }
      // Notify with all active timers
      callback(Array.from(timersMap.values()));
    });
    unsubscribers.push(unsubscribe);
  }

  // Return a function that unsubscribes from all listeners
  return () => {
    console.log(`[TimerFirebase] Cleaning up ${unsubscribers.length} timer listeners`);
    unsubscribers.forEach((unsub) => unsub());
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimerFirebaseService = {
  // CRUD
  createTimer,
  getTimer,
  updateTimer,
  deleteTimer,

  // State operations
  startTimerInFirestore,
  pauseTimerInFirestore,
  stopTimerInFirestore,

  // Batch operations
  updateTaskAggregates,
  batchStopTimer,

  // Transactions
  addTimeToTaskTransaction,

  // Listeners
  listenToTimer,
  listenToTaskTimers,
  listenToUserTimers,

  // Queries
  getActiveTimersForTask,
  getUserTimerForTask,
  getAllUserTimers,
  getUserActiveTimers,

  // Helpers
  generateDeviceId,
  convertIntervalToFirestore,
  convertIntervalFromFirestore,
} as const;
