/**
 * Team Service - Data layer for team management
 * Implements Apple's patterns:
 * - Multi-layer caching (Memory + IndexedDB)
 * - Promise-based progressive loading
 * - Error enrichment
 * - Request metrics tracking
 */

import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { get, set } from 'idb-keyval';
import { Team } from '@/stores/dataStore';
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

// --- Cache Keys ---
const IDB_CACHE_KEY = 'teams';
const MEMORY_CACHE_KEY = 'teams:all';

// --- Interfaces ---

export interface TeamsResult {
  data: Team[];
  source: 'cache' | 'network' | 'idb';
  promise?: Promise<Team[]>;
  metrics?: RequestMetrics;
}

/**
 * Fetches teams using multi-layer caching strategy.
 * Returns immediately if cached, with optional promise for fresh data.
 */
export async function getTeams(): Promise<TeamsResult> {
  const requestStartTime = Date.now();

  try {
    // Layer 1: Memory cache
    const memoryCache = globalRequestCache.get<Team[]>(MEMORY_CACHE_KEY);
    if (memoryCache) {
      return {
        data: memoryCache.data,
        source: 'cache',
        promise: fetchTeamsFromFirebase(requestStartTime),
        metrics: memoryCache.metrics,
      };
    }

    // Layer 2: IndexedDB cache
    const idbCache = await get<Team[]>(IDB_CACHE_KEY);
    if (idbCache) {
      return {
        data: idbCache,
        source: 'idb',
        promise: fetchTeamsFromFirebase(requestStartTime),
      };
    }

    // Layer 3: Network
    const teams = await fetchTeamsFromFirebase(requestStartTime);

    return {
      data: teams,
      source: 'network',
    };
  } catch (error) {

    const enrichedError = createEnrichedError(error, {
      component: 'teamService',
      action: 'getTeams',
    });

    addRetryAction(enrichedError, {
      type: 'GET_TEAMS',
      payload: {},
      maxAttempts: 3,
    });

    throw enrichedError;
  }
}

/**
 * Fetches fresh teams from Firebase and updates all cache layers.
 */
async function fetchTeamsFromFirebase(requestStartTime?: number): Promise<Team[]> {
  const startTime = requestStartTime ?? Date.now();

  try {
    // Fetch all teams ordered by creation date
    const teamsQuery = query(
      collection(db, 'teams'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(teamsQuery);
    const responseEndTime = Date.now();

    // Map Firestore documents to Team objects
    const teamsData: Team[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        memberIds: data.memberIds || [],
        isPublic: data.isPublic ?? false,
        gradientId: data.gradientId || 'gradient-1',
        avatarUrl: data.avatarUrl,
        createdBy: data.createdBy || '',
        createdAt: safeTimestampToISO(data.createdAt),
        updatedAt: data.updatedAt ? safeTimestampToISO(data.updatedAt) : undefined,
        lastMessageAt: data.lastMessageAt ? safeTimestampToISO(data.lastMessageAt) : undefined,
        clientId: data.clientId || '',
      };
    });

    // Create metrics
    const metrics = createRequestMetrics(startTime);
    metrics.responseEndTime = responseEndTime;

    // Update all cache layers
    await updateCacheLayers(teamsData, metrics);

    return teamsData;
  } catch (error) {

    const enrichedError = createEnrichedError(error, {
      component: 'teamService',
      action: 'fetchTeamsFromNetwork',
    });

    addRejectedIntent(enrichedError, {
      type: 'FETCH_TEAMS',
      timestamp: startTime,
    });

    throw enrichedError;
  }
}

/**
 * Update all cache layers (memory + IndexedDB).
 */
async function updateCacheLayers(teams: Team[], metrics: RequestMetrics): Promise<void> {
  // Update memory cache
  globalRequestCache.set(MEMORY_CACHE_KEY, teams, metrics);

  // Update IndexedDB cache
  await set(IDB_CACHE_KEY, teams);
}

/**
 * Invalidate team cache manually.
 */
export function invalidateTeamsCache(): void {
  globalRequestCache.invalidate(MEMORY_CACHE_KEY);
}

/**
 * Helper to create enriched error with common properties.
 */
function createEnrichedError(error: unknown, context: Record<string, unknown>): EnrichedError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const originalError = error instanceof Error ? error : undefined;

  const enrichedError = new EnrichedError(message, originalError);
  addContext(enrichedError, context);

  return enrichedError;
}
