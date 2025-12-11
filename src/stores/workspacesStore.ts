/**
 * @module stores/workspacesStore
 * @description Store para gestión de Workspaces (basado en Clientes/Cuentas)
 *
 * Un Workspace representa una cuenta de cliente.
 * - Admins ven todas las cuentas
 * - Usuarios normales solo ven cuentas de las tareas que tienen asignadas
 * - selectedWorkspaceId = 'all' muestra todas las tareas visibles
 */

import { create } from 'zustand';
import { Client } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

export const ALL_WORKSPACES_ID = 'all';

// ============================================================================
// TYPES
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  logo?: string;
  memberIds: string[]; // IDs de usuarios que pueden ver este workspace
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  // Campos adicionales del cliente original
  taskCount?: number;
}

interface WorkspacesState {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null; // 'all' | clientId
  isLoading: boolean;
  error: Error | null;
}

interface WorkspacesActions {
  setWorkspaces: (workspaces: Workspace[]) => void;
  setWorkspacesFromClients: (clients: Client[], userClientIds?: Set<string>) => void;
  setSelectedWorkspace: (workspaceId: string | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (workspaceId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
  // Nuevo: verificar si está filtrando por workspace específico
  isFilteringByWorkspace: () => boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: WorkspacesState = {
  workspaces: [],
  selectedWorkspaceId: ALL_WORKSPACES_ID, // Por defecto "Ver Todos"
  isLoading: false,
  error: null,
};

// ============================================================================
// HELPER: Convertir Client a Workspace
// ============================================================================

const clientToWorkspace = (client: Client, taskCount?: number): Workspace => ({
  id: client.id,
  name: client.name,
  logo: client.imageUrl,
  memberIds: [],
  createdBy: client.createdBy || '',
  createdAt: client.createdAt || new Date().toISOString(),
  taskCount,
});

// ============================================================================
// STORE
// ============================================================================

export const useWorkspacesStore = create<WorkspacesState & WorkspacesActions>((set, get) => ({
  ...initialState,

  setWorkspaces: (workspaces) => {
    set({ workspaces });

    // Mantener 'all' si está seleccionado, sino verificar que el workspace seleccionado existe
    const { selectedWorkspaceId } = get();
    if (selectedWorkspaceId !== ALL_WORKSPACES_ID) {
      const exists = workspaces.some((ws) => ws.id === selectedWorkspaceId);
      if (!exists) {
        set({ selectedWorkspaceId: ALL_WORKSPACES_ID });
      }
    }
  },

  /**
   * Convierte clientes a workspaces.
   * @param clients - Lista de todos los clientes
   * @param userClientIds - (Opcional) Set de clientIds que el usuario puede ver. Si no se pasa, muestra todos.
   */
  setWorkspacesFromClients: (clients, userClientIds) => {
    let filteredClients = clients;

    // Si se pasan userClientIds, filtrar solo esos clientes
    if (userClientIds && userClientIds.size > 0) {
      filteredClients = clients.filter((client) => userClientIds.has(client.id));
    }

    // Convertir clientes a workspaces
    const workspaces = filteredClients.map((client) => clientToWorkspace(client));

    set({ workspaces });

    // Restaurar selección desde sessionStorage si existe
    if (typeof window !== 'undefined') {
      const savedId = sessionStorage.getItem('selectedWorkspaceId');
      if (savedId) {
        const exists = savedId === ALL_WORKSPACES_ID || workspaces.some((ws) => ws.id === savedId);
        if (exists) {
          set({ selectedWorkspaceId: savedId });
          return;
        }
      }
    }

    // Por defecto, "Ver Todos"
    set({ selectedWorkspaceId: ALL_WORKSPACES_ID });
  },

  setSelectedWorkspace: (workspaceId) => {
    const finalId = workspaceId || ALL_WORKSPACES_ID;
    set({ selectedWorkspaceId: finalId });

    // Persist selection in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedWorkspaceId', finalId);
    }
  },

  addWorkspace: (workspace) => {
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    }));
  },

  updateWorkspace: (workspaceId, updates) => {
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId ? { ...ws, ...updates, updatedAt: new Date().toISOString() } : ws
      ),
    }));
  },

  removeWorkspace: (workspaceId) => {
    set((state) => {
      const newWorkspaces = state.workspaces.filter((ws) => ws.id !== workspaceId);
      const newSelectedId = state.selectedWorkspaceId === workspaceId
        ? ALL_WORKSPACES_ID
        : state.selectedWorkspaceId;

      return {
        workspaces: newWorkspaces,
        selectedWorkspaceId: newSelectedId,
      };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  isFilteringByWorkspace: () => {
    const { selectedWorkspaceId } = get();
    return selectedWorkspaceId !== null && selectedWorkspaceId !== ALL_WORKSPACES_ID;
  },
}));

// ============================================================================
// SELECTORS (Hooks optimizados)
// ============================================================================

export const useSelectedWorkspace = () => {
  return useWorkspacesStore((state) => {
    const { workspaces, selectedWorkspaceId } = state;
    if (selectedWorkspaceId === ALL_WORKSPACES_ID) {
      return null; // "Ver Todos" no tiene workspace específico
    }
    return workspaces.find((ws) => ws.id === selectedWorkspaceId) || null;
  });
};

export const useSelectedWorkspaceId = () => {
  return useWorkspacesStore((state) => state.selectedWorkspaceId);
};

export const useWorkspaces = () => {
  return useWorkspacesStore((state) => state.workspaces);
};

export const useWorkspacesLoading = () => {
  return useWorkspacesStore((state) => state.isLoading);
};

export const useIsFilteringByWorkspace = () => {
  return useWorkspacesStore((state) => state.isFilteringByWorkspace());
};
