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
  writeBatch,
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
function generateDeviceId(): string {
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
 *
 * @param userId - User ID who owns the timer
 * @param taskId - Task ID this timer is associated with
 * @returns Promise resolving to the created timer ID
 *
 * @example
 * ```typescript
 * const timerId = await createTimer('user123', 'task456');
 * console.log('Created timer:', timerId);
 * ```
 */
export async function createTimer(userId: string, taskId: string): Promise<string> {
  const timerId = `${userId}_${taskId}_${Date.now()}`;
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);

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

  console.log(`[TimerFirebase] Created timer: ${timerId}`);
  return timerId;
}

/**
 * Get a timer document from Firestore
 *
 * @param timerId - Timer ID
 * @returns Promise resolving to timer document or null if not found
 *
 * @example
 * ```typescript
 * const timer = await getTimer('user123_task456_1234567890');
 * if (timer) {
 *   console.log('Timer status:', timer.status);
 * }
 * ```
 */
export async function getTimer(timerId: string): Promise<TimerDocument | null> {
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
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
 *
 * @param timerId - Timer ID
 * @param data - Partial timer data to update
 *
 * @example
 * ```typescript
 * await updateTimer('timer123', {
 *   status: TimerStatus.PAUSED,
 *   pausedAt: Timestamp.now()
 * });
 * ```
 */
export async function updateTimer(
  timerId: string,
  data: Partial<Omit<TimerDocument, 'id'>>
): Promise<void> {
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);

  await updateDoc(timerRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  console.log(`[TimerFirebase] Updated timer: ${timerId}`);
}

/**
 * Delete a timer document from Firestore
 *
 * @param timerId - Timer ID
 *
 * @example
 * ```typescript
 * await deleteTimer('timer123');
 * console.log('Timer deleted');
 * ```
 */
export async function deleteTimer(timerId: string): Promise<void> {
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
  await deleteDoc(timerRef);

  // Also invalidate cache
  timerCache.invalidate(timerId);

  console.log(`[TimerFirebase] Deleted timer: ${timerId}`);
}

// ============================================================================
// TIMER STATE OPERATIONS
// ============================================================================

/**
 * Start a timer in Firestore
 * Sets status to running and records start time
 *
 * @param timerId - Timer ID
 *
 * @example
 * ```typescript
 * await startTimerInFirestore('timer123');
 * console.log('Timer started');
 * ```
 */
export async function startTimerInFirestore(timerId: string): Promise<void> {
  await updateTimer(timerId, {
    status: TimerStatus.RUNNING,
    startedAt: serverTimestamp() as Timestamp,
    pausedAt: null,
    lastSync: serverTimestamp() as Timestamp,
    deviceId: generateDeviceId(),
  });

  console.log(`[TimerFirebase] Started timer: ${timerId}`);
}

/**
 * Pause a timer in Firestore
 * Records the interval and updates total seconds
 *
 * @param timerId - Timer ID
 * @param interval - Interval to add
 *
 * @example
 * ```typescript
 * const interval = {
 *   start: new Date('2025-01-01T10:00:00'),
 *   end: new Date('2025-01-01T11:00:00'),
 *   duration: 3600
 * };
 * await pauseTimerInFirestore('timer123', interval);
 * ```
 */
export async function pauseTimerInFirestore(
  timerId: string,
  interval: TimerInterval
): Promise<void> {
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
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

  console.log(`[TimerFirebase] Paused timer: ${timerId}, duration: ${interval.duration}s`);
}

/**
 * Stop a timer in Firestore and update task aggregates
 * This is a two-step operation that should ideally be batched
 *
 * @param timerId - Timer ID
 * @param finalInterval - Final interval if timer was running
 *
 * @example
 * ```typescript
 * const finalInterval = {
 *   start: new Date('2025-01-01T10:00:00'),
 *   end: new Date('2025-01-01T11:00:00'),
 *   duration: 3600
 * };
 * await stopTimerInFirestore('timer123', finalInterval);
 * ```
 */
export async function stopTimerInFirestore(
  timerId: string,
  finalInterval: TimerInterval
): Promise<void> {
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
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
  await updateTaskAggregates(currentData.taskId, currentData.userId, finalSeconds);

  console.log(`[TimerFirebase] Stopped timer: ${timerId}, total: ${finalSeconds}s`);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Update task aggregate hours (totalHours and memberHours)
 * Uses batch write for atomicity
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
  const batch = writeBatch(db);
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

  const hoursToAdd = seconds / 3600;

  batch.update(taskRef, {
    [FIRESTORE_FIELDS.TOTAL_HOURS]: increment(hoursToAdd),
    [`${FIRESTORE_FIELDS.MEMBER_HOURS}.${userId}`]: increment(hoursToAdd),
    [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
  });

  await batch.commit();

  console.log(
    `[TimerFirebase] Updated task aggregates: ${taskId}, added ${hoursToAdd.toFixed(2)}h`
  );
}

/**
 * Stop timer and update task in a single atomic batch operation
 * Preferred over separate stopTimer + updateTaskAggregates calls
 *
 * @param timerId - Timer ID
 * @param taskId - Task ID
 * @param userId - User ID
 * @param interval - Final interval
 *
 * @example
 * ```typescript
 * await batchStopTimer('timer123', 'task456', 'user789', finalInterval);
 * ```
 */
export async function batchStopTimer(
  timerId: string,
  taskId: string,
  userId: string,
  interval: TimerInterval
): Promise<void> {
  const batch = writeBatch(db);

  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);
  const taskRef = doc(db, TASKS_COLLECTION_NAME, taskId);

  // Get current timer data
  const timerSnap = await getDoc(timerRef);
  if (!timerSnap.exists()) {
    throw new Error(ERROR_MESSAGES.TIMER_NOT_FOUND);
  }

  const currentData = timerSnap.data() as Omit<TimerDocument, 'id'>;
  const firestoreInterval = convertIntervalToFirestore(interval);
  const finalSeconds = currentData.totalSeconds + interval.duration;
  const hoursToAdd = finalSeconds / 3600;

  // Update timer
  batch.update(timerRef, {
    [FIRESTORE_FIELDS.STATUS]: TimerStatus.STOPPED,
    [FIRESTORE_FIELDS.INTERVALS]: arrayUnion(firestoreInterval),
    [FIRESTORE_FIELDS.TOTAL_SECONDS]: finalSeconds,
    [FIRESTORE_FIELDS.LAST_SYNC]: serverTimestamp(),
    [FIRESTORE_FIELDS.UPDATED_AT]: serverTimestamp(),
    [FIRESTORE_FIELDS.DEVICE_ID]: generateDeviceId(),
  });

  // Update task aggregates
  batch.update(taskRef, {
    [FIRESTORE_FIELDS.TOTAL_HOURS]: increment(hoursToAdd),
    [`${FIRESTORE_FIELDS.MEMBER_HOURS}.${userId}`]: increment(hoursToAdd),
    [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
  });

  await batch.commit();

  console.log(
    `[TimerFirebase] Batch stopped timer: ${timerId}, added ${hoursToAdd.toFixed(2)}h to task ${taskId}`
  );
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

/**
 * Add time to a task using a transaction
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
    const currentTotal = taskData[FIRESTORE_FIELDS.TOTAL_HOURS] || 0;
    const currentUserHours =
      taskData[FIRESTORE_FIELDS.MEMBER_HOURS]?.[userId] || 0;
    const hoursToAdd = seconds / 3600;

    transaction.update(taskRef, {
      [FIRESTORE_FIELDS.TOTAL_HOURS]: currentTotal + hoursToAdd,
      [`${FIRESTORE_FIELDS.MEMBER_HOURS}.${userId}`]: currentUserHours + hoursToAdd,
      [FIRESTORE_FIELDS.LAST_UPDATED]: serverTimestamp(),
    });
  });

  console.log(
    `[TimerFirebase] Added ${(seconds / 3600).toFixed(2)}h to task ${taskId} via transaction`
  );
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

/**
 * Listen to real-time updates for a specific timer
 * Returns unsubscribe function to stop listening
 *
 * @param timerId - Timer ID
 * @param callback - Callback function called on updates
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = listenToTimer('timer123', (timer) => {
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
  timerId: string,
  callback: (data: TimerDocument | null) => void
): Unsubscribe {
  const timerRef = doc(db, TIMER_COLLECTION_NAME, timerId);

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
      timerCache.set(timerId, timerDoc, hasPendingWrites);

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
  const q = query(
    collection(db, TIMER_COLLECTION_NAME),
    where(FIRESTORE_FIELDS.TASK_ID, '==', taskId)
  );

  const unsubscribe = onSnapshot(
    q,
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
  const q = query(
    collection(db, TIMER_COLLECTION_NAME),
    where(FIRESTORE_FIELDS.TASK_ID, '==', taskId),
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
 * Returns the most recent timer if multiple exist
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
  const q = query(
    collection(db, TIMER_COLLECTION_NAME),
    where(FIRESTORE_FIELDS.USER_ID, '==', userId),
    where(FIRESTORE_FIELDS.TASK_ID, '==', taskId)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  // Return the most recent one if multiple exist
  const docs = snapshot.docs.sort((a, b) => {
    const aTime = (a.data().createdAt as Timestamp).toMillis();
    const bTime = (b.data().createdAt as Timestamp).toMillis();
    return bTime - aTime; // Most recent first
  });

  const mostRecent = docs[0];
  const data = mostRecent.data() as Omit<TimerDocument, 'id'>;

  return {
    id: mostRecent.id,
    ...data,
  };
}

/**
 * Get all timers for a user across all tasks
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
  const q = query(
    collection(db, TIMER_COLLECTION_NAME),
    where(FIRESTORE_FIELDS.USER_ID, '==', userId)
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

  // Queries
  getActiveTimersForTask,
  getUserTimerForTask,
  getAllUserTimers,

  // Helpers
  generateDeviceId,
  convertIntervalToFirestore,
  convertIntervalFromFirestore,
} as const;
