/**
 * Task Service - Data layer for task management
 * Inspired by apps.apple.com architecture with:
 * - Promise-based async state management
 * - Optimistic updates with rollback
 * - Request caching with TTL
 * - Error enrichment and recovery
 */

import { collection, getDocs, query, limit, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { get, set } from 'idb-keyval';
import { Task } from '@/types';
import {
  globalRequestCache,
  generateCacheKey,
  createRequestMetrics,
  type RequestMetrics,
} from '@/shared/utils/request-cache';
import {
  EnrichedError,
  addRejectedIntent,
  addRetryAction,
  addContext,
  createHttpError,
  type ErrorIntent,
  type RetryAction,
} from '@/shared/utils/error-metadata';

// --- Helper Functions ---

/**
 * Safely convert Firestore Timestamp to ISO string.
 * Returns current date if timestamp is invalid.
 */
const safeTimestampToISO = (timestamp: Timestamp | Date | string | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return new Date().toISOString();
};

/**
 * Safely convert Firestore Timestamp to ISO string or null.
 * Returns null if timestamp is invalid.
 */
const safeTimestampToISOOrNull = (timestamp: Timestamp | Date | string | null | undefined): string | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return null;
};

// --- Cache Keys ---
const IDB_CACHE_KEY = 'tasks';
const MEMORY_CACHE_KEY = 'tasks:all';

// --- Interfaces ---

export interface TasksResult {
  data: Task[];
  source: 'cache' | 'network' | 'idb';
  promise?: Promise<Task[]>; // For progressive loading
  metrics?: RequestMetrics;
}

export interface OptimisticUpdate<T = any> {
  id: string;
  optimisticValue: T;
  originalValue: T;
  timestamp: number;
  rollback: () => void;
}

// --- Optimistic Updates Registry ---
const optimisticUpdates = new Map<string, OptimisticUpdate>();

/**
 * Fetches tasks using a multi-layer caching strategy:
 * 1. Memory cache (instant)
 * 2. IndexedDB cache (very fast, ~5ms)
 * 3. Network (Firebase)
 *
 * Implements "promise racing" pattern from Apple:
 * - Returns immediately if cached
 * - Returns promise that resolves with fresh data
 */
export async function getTasks(): Promise<TasksResult> {
  const requestStartTime = Date.now();

  try {
    // Layer 1: Memory cache (global request cache with TTL)
    const memoryCache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
    if (memoryCache) {
      console.log('[taskService] ⚡ HIT: Memory cache');

      // Return cached data + fetch fresh in background
      return {
        data: memoryCache.data,
        source: 'cache',
        promise: fetchTasksFromFirebase(requestStartTime), // Background refresh
        metrics: memoryCache.metrics,
      };
    }

    // Layer 2: IndexedDB cache (persistent)
    const idbCache = await get<Task[]>(IDB_CACHE_KEY);
    if (idbCache) {
      console.log('[taskService] ⚡ HIT: IndexedDB cache');

      // Return IDB data + fetch fresh in background
      return {
        data: idbCache,
        source: 'idb',
        promise: fetchTasksFromFirebase(requestStartTime), // Background refresh
      };
    }

    // Layer 3: Network (no cache available)
    console.log('[taskService] ❌ MISS: Fetching from network');
    const tasks = await fetchTasksFromFirebase(requestStartTime);

    return {
      data: tasks,
      source: 'network',
    };
  } catch (error) {
    console.error('[taskService] Error in getTasks:', error);

    // Enrich error with context
    const enrichedError = createEnrichedError(error, {
      component: 'taskService',
      action: 'getTasks',
    });

    // Add retry action
    addRetryAction(enrichedError, {
      type: 'GET_TASKS',
      payload: {},
      maxAttempts: 3,
    });

    throw enrichedError;
  }
}

/**
 * Fetches fresh tasks from Firebase and updates all cache layers.
 */
async function fetchTasksFromFirebase(requestStartTime?: number): Promise<Task[]> {
  const startTime = requestStartTime ?? Date.now();

  try {
    console.log('[taskService] 🌐 Fetching from Firebase...');

    // --- USER: CUSTOMIZE YOUR FIREBASE QUERY HERE ---
    const tasksQuery = query(
      collection(db, 'tasks'),
      limit(100),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(tasksQuery);
    const responseEndTime = Date.now();

    // Map Firestore documents to Task objects
    const tasksData: Task[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        clientId: data.clientId || '',
        project: data.project || '',
        name: data.name || '',
        description: data.description || '',
        status: data.status || '',
        priority: data.priority || '',
        startDate: safeTimestampToISOOrNull(data.startDate),
        endDate: safeTimestampToISOOrNull(data.endDate),
        LeadedBy: data.LeadedBy || [],
        AssignedTo: data.AssignedTo || [],
        createdAt: safeTimestampToISO(data.createdAt),
        CreatedBy: data.CreatedBy || '',
        lastActivity: safeTimestampToISO(data.lastActivity),
        hasUnreadUpdates: data.hasUnreadUpdates || false,
        lastViewedBy: data.lastViewedBy || {},
        archived: data.archived || false,
        archivedAt: safeTimestampToISOOrNull(data.archivedAt),
        archivedBy: data.archivedBy || '',
      };
    });

    // Create metrics
    const metrics = createRequestMetrics(startTime);
    metrics.responseEndTime = responseEndTime;

    // Update all cache layers
    await updateCacheLayers(tasksData, metrics);

    console.log(`[taskService] ✅ Fetched ${tasksData.length} tasks in ${responseEndTime - startTime}ms`);

    return tasksData;
  } catch (error) {
    console.error('[taskService] Network fetch failed:', error);

    const enrichedError = createEnrichedError(error, {
      component: 'taskService',
      action: 'fetchTasksFromNetwork',
    });

    // Add intent for error page
    addRejectedIntent(enrichedError, {
      type: 'FETCH_TASKS',
      timestamp: startTime,
    });

    throw enrichedError;
  }
}

/**
 * Update all cache layers (memory + IndexedDB).
 */
async function updateCacheLayers(tasks: Task[], metrics: RequestMetrics): Promise<void> {
  // Update memory cache
  globalRequestCache.set(MEMORY_CACHE_KEY, tasks, metrics);

  // Update IndexedDB cache
  await set(IDB_CACHE_KEY, tasks);
}

/**
 * Archives a task with optimistic update and rollback capability.
 * Implements Apple's optimistic update pattern.
 */
export async function archiveTask(taskId: string): Promise<void> {
  const updateId = `archive-${taskId}-${Date.now()}`;

  try {
    console.log(`[taskService] 📦 Archiving task: ${taskId} (optimistic)`);

    // 1. Get current cache
    const currentCache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
    if (!currentCache) {
      throw new Error('Cannot perform optimistic update: No cache available');
    }

    // 2. Find task to archive
    const taskIndex = currentCache.data.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in cache`);
    }

    const originalTask = currentCache.data[taskIndex];
    const optimisticTask = { ...originalTask, status: 'archived' };

    // 3. Create optimistic update with rollback function
    const rollback = () => {
      const cache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
      if (cache) {
        const newData = [...cache.data];
        newData[taskIndex] = originalTask;
        globalRequestCache.set(MEMORY_CACHE_KEY, newData, cache.metrics);
        console.log(`[taskService] ⏪ Rolled back archive for task: ${taskId}`);
      }
    };

    optimisticUpdates.set(updateId, {
      id: updateId,
      optimisticValue: optimisticTask,
      originalValue: originalTask,
      timestamp: Date.now(),
      rollback,
    });

    // 4. Apply optimistic update to cache
    const newData = [...currentCache.data];
    newData[taskIndex] = optimisticTask;
    globalRequestCache.set(MEMORY_CACHE_KEY, newData, currentCache.metrics);

    // 5. Update server
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      status: 'archived',
      archivedAt: Timestamp.now(),
    });

    // 6. Commit successful - remove from registry
    optimisticUpdates.delete(updateId);
    console.log(`[taskService] ✅ Task archived successfully: ${taskId}`);

    // 7. Refresh cache with fresh data
    await fetchTasksFromFirebase();
  } catch (error) {
    console.error(`[taskService] ❌ Archive failed for task ${taskId}:`, error);

    // Rollback optimistic update
    const update = optimisticUpdates.get(updateId);
    if (update) {
      update.rollback();
      optimisticUpdates.delete(updateId);
    }

    // Enrich error
    const enrichedError = createEnrichedError(error, {
      component: 'taskService',
      action: 'archiveTask',
      taskId,
    });

    addRetryAction(enrichedError, {
      type: 'ARCHIVE_TASK',
      payload: { taskId },
      maxAttempts: 3,
    });

    throw enrichedError;
  }
}

/**
 * Unarchives a task with optimistic update.
 */
export async function unarchiveTask(taskId: string): Promise<void> {
  const updateId = `unarchive-${taskId}-${Date.now()}`;

  try {
    console.log(`[taskService] 📤 Unarchiving task: ${taskId} (optimistic)`);

    // Similar pattern to archiveTask
    const currentCache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
    if (!currentCache) {
      throw new Error('Cannot perform optimistic update: No cache available');
    }

    const taskIndex = currentCache.data.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in cache`);
    }

    const originalTask = currentCache.data[taskIndex];
    const optimisticTask = { ...originalTask, status: originalTask.status || 'pending' };

    const rollback = () => {
      const cache = globalRequestCache.get<Task[]>(MEMORY_CACHE_KEY);
      if (cache) {
        const newData = [...cache.data];
        newData[taskIndex] = originalTask;
        globalRequestCache.set(MEMORY_CACHE_KEY, newData, cache.metrics);
        console.log(`[taskService] ⏪ Rolled back unarchive for task: ${taskId}`);
      }
    };

    optimisticUpdates.set(updateId, {
      id: updateId,
      optimisticValue: optimisticTask,
      originalValue: originalTask,
      timestamp: Date.now(),
      rollback,
    });

    // Apply optimistic update
    const newData = [...currentCache.data];
    newData[taskIndex] = optimisticTask;
    globalRequestCache.set(MEMORY_CACHE_KEY, newData, currentCache.metrics);

    // Update server
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      status: originalTask.status || 'pending',
      archivedAt: null,
    });

    optimisticUpdates.delete(updateId);
    console.log(`[taskService] ✅ Task unarchived successfully: ${taskId}`);

    await fetchTasksFromFirebase();
  } catch (error) {
    console.error(`[taskService] ❌ Unarchive failed for task ${taskId}:`, error);

    const update = optimisticUpdates.get(updateId);
    if (update) {
      update.rollback();
      optimisticUpdates.delete(updateId);
    }

    const enrichedError = createEnrichedError(error, {
      component: 'taskService',
      action: 'unarchiveTask',
      taskId,
    });

    addRetryAction(enrichedError, {
      type: 'UNARCHIVE_TASK',
      payload: { taskId },
      maxAttempts: 3,
    });

    throw enrichedError;
  }
}

/**
 * Invalidate task cache manually (e.g., after creating/deleting a task).
 */
export function invalidateTasksCache(): void {
  globalRequestCache.invalidate(MEMORY_CACHE_KEY);
  console.log('[taskService] Cache invalidated');
}

/**
 * Get pending optimistic updates (useful for debugging).
 */
export function getPendingOptimisticUpdates(): OptimisticUpdate[] {
  return Array.from(optimisticUpdates.values());
}

/**
 * Helper to create enriched error with common properties.
 */
function createEnrichedError(error: unknown, context: any): EnrichedError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const originalError = error instanceof Error ? error : undefined;

  const enrichedError = new EnrichedError(message, originalError);
  addContext(enrichedError, context);

  return enrichedError;
}
