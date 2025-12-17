/**
 * ClientsDataStore - Optimized Cache for Client Data
 *
 * Simpler than tasksDataStore because clients change infrequently.
 * Architecture:
 * - Map<clientId, Client> for O(1) access
 * - SessionStorage cache for persistence
 * - Uses existing clientService for fetching
 * - No real-time subscriptions needed
 *
 * Benefits:
 * - O(1) client access by ID instead of array.find()
 * - Optimized hooks: useClientName(clientId)
 * - Shared cache across components
 * - Fast initial loads from SessionStorage
 */

import { create } from 'zustand';
import { Client } from '@/types';

// --- Constants ---

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (clients change rarely)
const SESSION_STORAGE_KEY = 'clients_cache_all';

// --- Interfaces ---

interface CachedClientsEntry {
  data: Map<string, Client>;
  timestamp: number;
}

interface ClientsDataState {
  // Cache as Map for O(1) access
  clients: Map<string, Client>;

  // Loading state
  isLoading: boolean;

  // Error state
  error: Error | null;

  // Last fetch timestamp
  lastFetch: number;
}

interface ClientsDataActions {
  // Set clients (called by clientService)
  setClients: (clients: Client[]) => void;

  // Get client by ID
  getClient: (clientId: string) => Client | null;

  // Get client name
  getClientName: (clientId: string) => string;

  // Get all clients as array
  getAllClients: () => Client[];

  // Remove a client from cache (after deletion)
  removeClient: (clientId: string) => void;

  // Set loading state
  setLoading: (isLoading: boolean) => void;

  // Set error
  setError: (error: Error | null) => void;

  // Invalidate cache
  invalidate: () => void;

  // Check if cache is fresh
  isCacheFresh: () => boolean;
}

type ClientsDataStore = ClientsDataState & ClientsDataActions;

// --- Helper Functions ---

/**
 * Check if we're running in a browser environment.
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Load clients from SessionStorage.
 */
const loadFromSessionStorage = (): Map<string, Client> | null => {
  // Skip on server-side
  if (!isBrowser) return null;

  try {
    const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!cached) return null;

    const entry: CachedClientsEntry = JSON.parse(cached);

    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    // Convert array back to Map
    const clientsMap = new Map<string, Client>();
    Object.entries(entry.data).forEach(([id, client]) => {
      clientsMap.set(id, client as Client);
    });

    return clientsMap;
  } catch (error) {
    console.warn('[clientsDataStore] Error loading from SessionStorage:', error);
    return null;
  }
};

/**
 * Save clients to SessionStorage.
 */
const saveToSessionStorage = (clients: Map<string, Client>): void => {
  // Skip on server-side
  if (!isBrowser) return;

  try {
    // Convert Map to plain object for JSON serialization
    const clientsObj = Object.fromEntries(clients);

    const entry: CachedClientsEntry = {
      data: clientsObj as any,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entry));
  } catch (error) {
    // Fail silently (quota exceeded, etc.)
    console.warn('[clientsDataStore] Error saving to SessionStorage:', error);
  }
};

// --- Store Creation ---

export const useClientsDataStore = create<ClientsDataStore>((set, get) => {
  // Try to load from SessionStorage on initialization
  const cachedClients = loadFromSessionStorage();

  return {
    // --- State ---
    clients: cachedClients || new Map<string, Client>(),
    isLoading: false,
    error: null,
    lastFetch: cachedClients ? Date.now() : 0,

    // --- Actions ---

    /**
     * Set clients data (called by clientService after fetch).
     */
    setClients: (clientsArray: Client[]) => {
      const clientsMap = new Map<string, Client>();

      clientsArray.forEach((client) => {
        clientsMap.set(client.id, client);
      });

      // Save to SessionStorage
      saveToSessionStorage(clientsMap);

      set({
        clients: clientsMap,
        lastFetch: Date.now(),
        isLoading: false,
        error: null,
      });
    },

    /**
     * Get client by ID (O(1) access).
     */
    getClient: (clientId: string) => {
      const state = get();
      return state.clients.get(clientId) || null;
    },

    /**
     * Get client name (optimized selector).
     */
    getClientName: (clientId: string) => {
      const client = get().getClient(clientId);
      return client?.name || 'Cliente desconocido';
    },

    /**
     * Get all clients as array.
     */
    getAllClients: () => {
      return Array.from(get().clients.values());
    },

    /**
     * Remove a client from cache (after deletion).
     */
    removeClient: (clientId: string) => {
      const state = get();
      const newClients = new Map(state.clients);
      newClients.delete(clientId);

      // Update SessionStorage
      saveToSessionStorage(newClients);

      set({
        clients: newClients,
      });
    },

    /**
     * Set loading state.
     */
    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    /**
     * Set error.
     */
    setError: (error: Error | null) => {
      set({ error, isLoading: false });
    },

    /**
     * Invalidate cache.
     */
    invalidate: () => {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (error) {
        console.warn('[clientsDataStore] Error removing from SessionStorage:', error);
      }

      set({
        clients: new Map<string, Client>(),
        lastFetch: 0,
        error: null,
      });
    },

    /**
     * Check if cache is still fresh.
     */
    isCacheFresh: () => {
      const state = get();
      const age = Date.now() - state.lastFetch;
      return age < CACHE_TTL && state.clients.size > 0;
    },
  };
});
