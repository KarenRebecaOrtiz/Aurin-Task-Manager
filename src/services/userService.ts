/**
 * User Service - Data layer for user management
 * Implements Apple's patterns:
 * - Multi-layer caching (Memory + IndexedDB)
 * - Promise-based progressive loading
 * - Error enrichment
 * - Request metrics tracking
 * - Dual-source data (API + Firestore enrichment)
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { get, set } from 'idb-keyval';
import { User } from '@/types';
import {
  globalRequestCache,
  createRequestMetrics,
  type RequestMetrics,
} from '@/shared/utils/request-cache';
import {
  EnrichedError,
  addRejectedIntent,
  addRetryAction,
  addContext,
  createHttpError,
} from '@/shared/utils/error-metadata';

// --- Cache Keys ---
const IDB_CACHE_KEY = 'users';
const MEMORY_CACHE_KEY = 'users:all';

// --- Interfaces ---

export interface UsersResult {
  data: User[];
  source: 'cache' | 'network' | 'idb';
  promise?: Promise<User[]>;
  metrics?: RequestMetrics;
}

/**
 * Fetches users using multi-layer caching strategy.
 * Users are fetched from Clerk API and enriched with Firestore data.
 */
export async function getUsers(): Promise<UsersResult> {
  const requestStartTime = Date.now();

  try {
    // Layer 1: Memory cache
    const memoryCache = globalRequestCache.get<User[]>(MEMORY_CACHE_KEY);
    if (memoryCache) {
      console.log('[userService] ⚡ HIT: Memory cache');

      return {
        data: memoryCache.data,
        source: 'cache',
        promise: fetchUsersFromNetwork(requestStartTime),
        metrics: memoryCache.metrics,
      };
    }

    // Layer 2: IndexedDB cache
    const idbCache = await get<User[]>(IDB_CACHE_KEY);
    if (idbCache) {
      console.log('[userService] ⚡ HIT: IndexedDB cache');

      return {
        data: idbCache,
        source: 'idb',
        promise: fetchUsersFromNetwork(requestStartTime),
      };
    }

    // Layer 3: Network
    console.log('[userService] ❌ MISS: Fetching from network');
    const users = await fetchUsersFromNetwork(requestStartTime);

    return {
      data: users,
      source: 'network',
    };
  } catch (error) {
    console.error('[userService] Error in getUsers:', error);

    const enrichedError = createEnrichedError(error, {
      component: 'userService',
      action: 'getUsers',
    });

    addRetryAction(enrichedError, {
      type: 'GET_USERS',
      payload: {},
      maxAttempts: 3,
    });

    throw enrichedError;
  }
}

/**
 * Fetches fresh users from API and Firestore, then updates all cache layers.
 * This is a complex operation that combines two data sources.
 */
async function fetchUsersFromNetwork(requestStartTime?: number): Promise<User[]> {
  const startTime = requestStartTime ?? Date.now();

  try {
    console.log('[userService] 🌐 Fetching from API and Firestore...');

    // --- STEP 1: Fetch from Clerk API ---
    const apiStartTime = Date.now();
    const response = await fetch('/api/users');

    if (!response.ok) {
      throw createHttpError(
        response.status,
        `Failed to fetch users: ${response.statusText}`,
        { endpoint: '/api/users' }
      );
    }

    const responseData = await response.json();
    const clerkUsers = responseData.success ? responseData.data : responseData;

    console.log(`[userService] ✅ Fetched ${clerkUsers.length} users from API in ${Date.now() - apiStartTime}ms`);

    // --- STEP 2: Enrich with Firestore data ---
    const firestoreStartTime = Date.now();
    const userIds = clerkUsers.map((user: any) => user.id);

    const userDocs = await Promise.all(
      userIds.map((id: string) => getDoc(doc(db, 'users', id)))
    );

    console.log(`[userService] ✅ Enriched ${userDocs.length} users from Firestore in ${Date.now() - firestoreStartTime}ms`);

    // --- STEP 3: Map and merge data ---
    const usersData: User[] = clerkUsers.map((clerkUser: any, index: number) => {
      const userDoc = userDocs[index];
      const userData = userDoc.exists() ? userDoc.data() : {};

      // --- USER: CUSTOMIZE YOUR DATA MAPPING HERE ---
      return {
        id: clerkUser.id,
        imageUrl: clerkUser.imageUrl || '',
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
        role: userData.role || clerkUser.publicMetadata?.role || 'Sin rol',
        description: userData.description || clerkUser.publicMetadata?.description || '',
        status: userData.status || undefined,
      } as User;
    });

    const responseEndTime = Date.now();

    // Create metrics
    const metrics = createRequestMetrics(startTime);
    metrics.responseEndTime = responseEndTime;

    // Update all cache layers
    await updateCacheLayers(usersData, metrics);

    console.log(`[userService] ✅ Total fetch time: ${responseEndTime - startTime}ms`);

    return usersData;
  } catch (error) {
    console.error('[userService] Network fetch failed:', error);

    // If already enriched error, re-throw
    if (error instanceof EnrichedError) {
      throw error;
    }

    const enrichedError = createEnrichedError(error, {
      component: 'userService',
      action: 'fetchUsersFromNetwork',
    });

    addRejectedIntent(enrichedError, {
      type: 'FETCH_USERS',
      timestamp: startTime,
    });

    throw enrichedError;
  }
}

/**
 * Update all cache layers (memory + IndexedDB).
 */
async function updateCacheLayers(users: User[], metrics: RequestMetrics): Promise<void> {
  // Update memory cache
  globalRequestCache.set(MEMORY_CACHE_KEY, users, metrics);

  // Update IndexedDB cache
  await set(IDB_CACHE_KEY, users);
}

/**
 * Invalidate user cache manually.
 */
export function invalidateUsersCache(): void {
  globalRequestCache.invalidate(MEMORY_CACHE_KEY);
  console.log('[userService] Cache invalidated');
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
