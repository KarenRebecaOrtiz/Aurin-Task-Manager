/**
 * useClientData Hooks - Optimized Client Data Access
 *
 * Provides hooks for accessing client data from clientsDataStore.
 * Simpler than task hooks because clients don't need real-time subscriptions.
 *
 * Usage:
 * - useClientData(clientId) - Full client object
 * - useClientName(clientId) - Only client name
 * - useAllClients() - All clients as array
 */

import { useMemo } from 'react';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { useShallow } from 'zustand/react/shallow';
import { Client } from '@/types';

// --- Individual Hooks (Optimized Selectors) ---

/**
 * Get client data by ID.
 * O(1) access from Map instead of array.find().
 *
 * @example
 * const client = useClientData(clientId);
 * if (!client) return <Skeleton />;
 * return <div>{client.name}</div>;
 */
export function useClientData(clientId: string): Client | null {
  return useClientsDataStore((state) => state.getClient(clientId));
}

/**
 * Get only the client name (optimized - only re-renders when name changes).
 * Perfect for components that only display the client name.
 *
 * @example
 * const clientName = useClientName(task.clientId);
 * return <span>{clientName}</span>;
 */
export function useClientName(clientId: string): string {
  return useClientsDataStore((state) => state.getClientName(clientId));
}

/**
 * Get client image URL (optimized selector).
 *
 * @example
 * const imageUrl = useClientImageUrl(clientId);
 * return <img src={imageUrl} alt="Client logo" />;
 */
export function useClientImageUrl(clientId: string): string {
  return useClientsDataStore((state) => {
    const client = state.getClient(clientId);
    return client?.imageUrl || '/empty-image.png';
  });
}

/**
 * Get all clients as an array.
 * Use this for dropdowns, filters, etc.
 * Uses useShallow to prevent infinite re-renders.
 *
 * @example
 * const clients = useAllClients();
 * return (
 *   <select>
 *     {clients.map(client => (
 *       <option key={client.id} value={client.id}>{client.name}</option>
 *     ))}
 *   </select>
 * );
 */
export function useAllClients(): Client[] {
  // Get the Map directly and memoize the array conversion
  const clientsMap = useClientsDataStore(useShallow((state) => state.clients));

  return useMemo(() => {
    return Array.from(clientsMap.values());
  }, [clientsMap]);
}

// --- State Hooks ---

/**
 * Check if clients are loading.
 */
export function useClientsLoading(): boolean {
  return useClientsDataStore((state) => state.isLoading);
}

/**
 * Get clients error if any.
 */
export function useClientsError(): Error | null {
  return useClientsDataStore((state) => state.error);
}

/**
 * Get clients with loading and error states.
 * Use this for components that need to handle all states.
 *
 * @example
 * const { clients, isLoading, error } = useClientsState();
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * return <ClientsList clients={clients} />;
 */
export function useClientsState() {
  const clients = useAllClients();
  const isLoading = useClientsLoading();
  const error = useClientsError();

  return {
    clients,
    isLoading,
    error,
  };
}

// --- Utility Hooks ---

/**
 * Check if cache is fresh (< 30 minutes old).
 * Useful to decide if you need to refetch.
 */
export function useIsCacheFresh(): boolean {
  return useClientsDataStore((state) => state.isCacheFresh());
}
