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
      console.log('[clientService] ⚡ HIT: Memory cache');

      return {
        data: memoryCache.data,
        source: 'cache',
        promise: fetchClientsFromNetwork(requestStartTime),
        metrics: memoryCache.metrics,
      };
    }

    // Layer 2: IndexedDB cache
    const idbCache = await get<Client[]>(IDB_CACHE_KEY);
    if (idbCache) {
      console.log('[clientService] ⚡ HIT: IndexedDB cache');

      return {
        data: idbCache,
        source: 'idb',
        promise: fetchClientsFromNetwork(requestStartTime),
      };
    }

    // Layer 3: Network
    console.log('[clientService] ❌ MISS: Fetching from network');
    const clients = await fetchClientsFromNetwork(requestStartTime);

    return {
      data: clients,
      source: 'network',
    };
  } catch (error) {
    console.error('[clientService] Error in getClients:', error);

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
async function fetchClientsFromNetwork(requestStartTime?: number): Promise<Client[]> {
  const startTime = requestStartTime ?? Date.now();

  try {
    console.log('[clientService] 🌐 Fetching from Firebase...');

    // --- USER: CUSTOMIZE YOUR FIREBASE QUERY HERE ---
    const clientsQuery = query(
      collection(db, 'clients'),
      limit(50)
    );

    const snapshot = await getDocs(clientsQuery);
    const responseEndTime = Date.now();

    // --- USER: CUSTOMIZE YOUR DATA MAPPING HERE ---
    const clientsData: Client[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps if needed
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      } as Client;
    });

    // Create metrics
    const metrics = createRequestMetrics(startTime);
    metrics.responseEndTime = responseEndTime;

    // Update all cache layers
    await updateCacheLayers(clientsData, metrics);

    console.log(`[clientService] ✅ Fetched ${clientsData.length} clients in ${responseEndTime - startTime}ms`);

    return clientsData;
  } catch (error) {
    console.error('[clientService] Network fetch failed:', error);

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
  console.log('[clientService] Cache invalidated');
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
