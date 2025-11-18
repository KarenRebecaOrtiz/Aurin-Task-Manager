/**
 * Client Service - Data layer for client management
 * Implements Apple's patterns:
 * - Multi-layer caching (Memory + IndexedDB)
 * - Promise-based progressive loading
 * - Error enrichment
 * - Request metrics tracking
 */

import { collection, getDocs, query, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { get, set } from 'idb-keyval';
import { Client } from '@/types';
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
const IDB_CACHE_KEY = 'clients';
const MEMORY_CACHE_KEY = 'clients:all';

// --- Interfaces ---

export interface ClientsResult {
  data: Client[];
  source: 'cache' | 'network' | 'idb';
  promise?: Promise<Client[]>;
  metrics?: RequestMetrics;
}

/**
 * Fetches clients using multi-layer caching strategy.
 * Returns immediately if cached, with optional promise for fresh data.
 */
export async function getClients(): Promise<ClientsResult> {
  const requestStartTime = Date.now();

  try {
    // Layer 1: Memory cache
    const memoryCache = globalRequestCache.get<Client[]>(MEMORY_CACHE_KEY);
    if (memoryCache) {
      return {
        data: memoryCache.data,
        source: 'cache',
        promise: fetchClientsFromFirebase(requestStartTime),
        metrics: memoryCache.metrics,
      };
    }

    // Layer 2: IndexedDB cache
    const idbCache = await get<Client[]>(IDB_CACHE_KEY);
    if (idbCache) {
      return {
        data: idbCache,
        source: 'idb',
        promise: fetchClientsFromFirebase(requestStartTime),
      };
    }

    // Layer 3: Network
    const clients = await fetchClientsFromFirebase(requestStartTime);

    return {
      data: clients,
      source: 'network',
    };
  } catch (error) {

    const enrichedError = createEnrichedError(error, {
      component: 'clientService',
      action: 'getClients',
    });

    addRetryAction(enrichedError, {
      type: 'GET_CLIENTS',
      payload: {},
      maxAttempts: 3,
    });

    throw enrichedError;
  }
}

/**
 * Fetches fresh clients from Firebase and updates all cache layers.
 */
async function fetchClientsFromFirebase(requestStartTime?: number): Promise<Client[]> {
  const startTime = requestStartTime ?? Date.now();

  try {

    // --- USER: CUSTOMIZE YOUR FIREBASE QUERY HERE ---
    const clientsQuery = query(
      collection(db, 'clients'),
      limit(50)
    );

    const snapshot = await getDocs(clientsQuery);
    const responseEndTime = Date.now();

    // Map Firestore documents to Client objects
    const clientsData: Client[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        imageUrl: data.imageUrl || '/empty-image.png',
        projectCount: data.projectCount || 0,
        projects: data.projects || [],
        createdBy: data.createdBy || '',
        createdAt: safeTimestampToISO(data.createdAt),
      };
    });

    // Create metrics
    const metrics = createRequestMetrics(startTime);
    metrics.responseEndTime = responseEndTime;

    // Update all cache layers
    await updateCacheLayers(clientsData, metrics);

    return clientsData;
  } catch (error) {

    const enrichedError = createEnrichedError(error, {
      component: 'clientService',
      action: 'fetchClientsFromNetwork',
    });

    addRejectedIntent(enrichedError, {
      type: 'FETCH_CLIENTS',
      timestamp: startTime,
    });

    throw enrichedError;
  }
}

/**
 * Update all cache layers (memory + IndexedDB).
 */
async function updateCacheLayers(clients: Client[], metrics: RequestMetrics): Promise<void> {
  // Update memory cache
  globalRequestCache.set(MEMORY_CACHE_KEY, clients, metrics);

  // Update IndexedDB cache
  await set(IDB_CACHE_KEY, clients);
}

/**
 * Invalidate client cache manually.
 */
export function invalidateClientsCache(): void {
  globalRequestCache.invalidate(MEMORY_CACHE_KEY);
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
