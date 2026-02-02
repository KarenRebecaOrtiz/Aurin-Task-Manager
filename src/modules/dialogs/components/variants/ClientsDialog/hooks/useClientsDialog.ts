/**
 * useClientsDialog Hook
 *
 * Encapsulates all logic for the ClientsDialog component.
 * Uses global stores for reactive data instead of local state.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDataStore, useClients, useClientsLoading } from '@/stores/dataStore';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { clientService } from '@/modules/client-crud/services/clientService';
import { invalidateClientsCache } from '@/lib/cache-utils';
import { Client } from '@/types';
import {
  ActionMenuState,
  DrawerState,
  DeleteConfirmState,
  NestedDialogsState,
  UseClientsDialogReturn,
} from '../types';

/**
 * Hook that manages all ClientsDialog state and logic.
 *
 * Key differences from the old implementation:
 * - Uses useClients() from store instead of local useState
 * - No fetchClients() calls - stores are updated by nested dialogs
 * - UI state is local, data state is from stores
 */
export function useClientsDialog(isOpen: boolean): UseClientsDialogReturn {
  // ============================================================
  // REACTIVE DATA FROM STORES (not local state)
  // ============================================================

  // useClients() already has useShallow optimization
  const clients = useClients();
  const isLoading = useClientsLoading();

  // Store actions
  const deleteClientFromStore = useDataStore((state) => state.deleteClient);
  const removeClientFromClientsStore = useClientsDataStore(
    (state) => state.removeClient
  );

  // ============================================================
  // LOCAL STATE (UI only, not data)
  // ============================================================

  const [actionMenu, setActionMenu] = useState<ActionMenuState>({
    openMenuId: null,
    position: { top: 0, left: 0 },
  });

  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    selectedClient: null,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    client: null,
    isDeleting: false,
  });

  const [nestedDialogs, setNestedDialogs] = useState<NestedDialogsState>({
    clientDialog: { isOpen: false, mode: 'create' },
    projectsDialog: { isOpen: false, client: null },
  });

  // ============================================================
  // REFS AND EXTERNAL HOOKS
  // ============================================================

  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { success: showSuccess, error: showError } = useSonnerToast();

  // ============================================================
  // EFFECTS
  // ============================================================

  // Close menu on outside click
  useEffect(() => {
    if (!actionMenu.openMenuId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const menuEl = menuRef.current;
      const buttonEl = buttonRefs.current.get(actionMenu.openMenuId!);

      if (
        menuEl &&
        !menuEl.contains(e.target as Node) &&
        buttonEl &&
        !buttonEl.contains(e.target as Node)
      ) {
        setActionMenu({ openMenuId: null, position: { top: 0, left: 0 } });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenu.openMenuId]);

  // Reset UI state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActionMenu({ openMenuId: null, position: { top: 0, left: 0 } });
      setDrawer({ isOpen: false, selectedClient: null });
    }
  }, [isOpen]);

  // ============================================================
  // MENU HANDLERS
  // ============================================================

  const handleMenuOpen = useCallback(
    (client: Client, buttonEl: HTMLButtonElement) => {
      if (isMobile) {
        setDrawer({ isOpen: true, selectedClient: client });
      } else {
        const rect = buttonEl.getBoundingClientRect();
        setActionMenu({
          openMenuId: actionMenu.openMenuId === client.id ? null : client.id,
          position: { top: rect.bottom + 8, left: rect.right - 160 },
        });
      }
    },
    [isMobile, actionMenu.openMenuId]
  );

  const handleMenuClose = useCallback(() => {
    setActionMenu({ openMenuId: null, position: { top: 0, left: 0 } });
    setDrawer({ isOpen: false, selectedClient: null });
  }, []);

  // ============================================================
  // CRUD ACTION HANDLERS
  // ============================================================

  const handleEditClient = useCallback((client: Client) => {
    setNestedDialogs((prev) => ({
      ...prev,
      clientDialog: { isOpen: true, clientId: client.id, mode: 'edit' },
    }));
    setActionMenu({ openMenuId: null, position: { top: 0, left: 0 } });
    setDrawer({ isOpen: false, selectedClient: null });
  }, []);

  const handleCreateClient = useCallback(() => {
    setNestedDialogs((prev) => ({
      ...prev,
      clientDialog: { isOpen: true, clientId: undefined, mode: 'create' },
    }));
  }, []);

  const handleManageProjects = useCallback((client: Client) => {
    setNestedDialogs((prev) => ({
      ...prev,
      projectsDialog: { isOpen: true, client },
    }));
    setActionMenu({ openMenuId: null, position: { top: 0, left: 0 } });
    setDrawer({ isOpen: false, selectedClient: null });
  }, []);

  const handleDeleteClick = useCallback((client: Client) => {
    setDeleteConfirm({ show: true, client, isDeleting: false });
    setActionMenu({ openMenuId: null, position: { top: 0, left: 0 } });
    setDrawer({ isOpen: false, selectedClient: null });
  }, []);

  // ============================================================
  // DELETE HANDLER (Optimistic)
  // ============================================================

  const handleConfirmDelete = useCallback(async () => {
    const clientToDelete = deleteConfirm.client;
    if (!clientToDelete) return;

    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));

    try {
      // 1. Call backend
      await clientService.deleteClient(clientToDelete.id);

      // 2. Update both stores
      deleteClientFromStore(clientToDelete.id);
      removeClientFromClientsStore(clientToDelete.id);

      // 3. Invalidate cache
      invalidateClientsCache();

      // 4. Show success
      showSuccess(`Cuenta "${clientToDelete.name}" eliminada exitosamente`);
      setDeleteConfirm({ show: false, client: null, isDeleting: false });
    } catch (error) {
      console.error('Error deleting client:', error);
      showError(
        'Error al eliminar cuenta',
        error instanceof Error ? error.message : 'No se pudo eliminar la cuenta'
      );
      setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
    }
  }, [
    deleteConfirm.client,
    deleteClientFromStore,
    removeClientFromClientsStore,
    showSuccess,
    showError,
  ]);

  const handleCloseDeleteConfirm = useCallback(() => {
    if (!deleteConfirm.isDeleting) {
      setDeleteConfirm({ show: false, client: null, isDeleting: false });
    }
  }, [deleteConfirm.isDeleting]);

  // ============================================================
  // NESTED DIALOG HANDLERS
  // ============================================================

  /**
   * Handle ClientDialog open/close.
   * NO fetchClients() - ClientDialog updates stores directly.
   */
  const handleClientDialogChange = useCallback((open: boolean) => {
    setNestedDialogs((prev) => ({
      ...prev,
      clientDialog: open
        ? prev.clientDialog
        : { isOpen: false, mode: 'create' },
    }));
  }, []);

  /**
   * Handle ManageProjectsDialog open/close.
   * NO fetchClients() - ManageProjectsDialog updates stores directly.
   */
  const handleProjectsDialogChange = useCallback((open: boolean) => {
    setNestedDialogs((prev) => ({
      ...prev,
      projectsDialog: open
        ? prev.projectsDialog
        : { isOpen: false, client: null },
    }));
  }, []);

  // ============================================================
  // UTILITIES
  // ============================================================

  const getClientInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  /**
   * Creates a ref callback for button elements.
   * Used for positioning the action menu.
   */
  const setButtonRef = useCallback((clientId: string) => {
    return (el: HTMLButtonElement | null) => {
      if (el) {
        buttonRefs.current.set(clientId, el);
      } else {
        buttonRefs.current.delete(clientId);
      }
    };
  }, []);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Reactive data from store
    clients,
    isLoading,

    // UI State
    actionMenu,
    drawer,
    deleteConfirm,
    nestedDialogs,

    // Menu actions
    handleMenuOpen,
    handleMenuClose,

    // CRUD actions
    handleEditClient,
    handleCreateClient,
    handleManageProjects,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseDeleteConfirm,

    // Nested dialog handlers
    handleClientDialogChange,
    handleProjectsDialogChange,

    // Utilities
    getClientInitials,
    isMobile,
    menuRef,
    setButtonRef,
  };
}
