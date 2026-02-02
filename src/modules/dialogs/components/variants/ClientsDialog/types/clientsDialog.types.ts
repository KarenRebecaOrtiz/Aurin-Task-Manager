/**
 * ClientsDialog Types
 * Type definitions for the ClientsDialog module
 */

import { Client } from '@/types';
import { RefObject } from 'react';

// ============================================================
// COMPONENT PROPS
// ============================================================

/**
 * Props for the main ClientsDialog component
 */
export interface ClientsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Props for ClientListItem component
 */
export interface ClientListItemProps {
  client: Client;
  isDeleting: boolean;
  onMenuOpen: (client: Client, buttonEl: HTMLButtonElement) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  getClientInitials: (name: string) => string;
}

/**
 * Props for ClientActionMenu component (desktop)
 */
export interface ClientActionMenuProps {
  client: Client;
  position: { top: number; left: number };
  onEdit: () => void;
  onManageProjects: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Props for ClientActionDrawer component (mobile)
 */
export interface ClientActionDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onEdit: () => void;
  onManageProjects: () => void;
  onDelete: () => void;
}

// ============================================================
// STATE INTERFACES
// ============================================================

/**
 * State for the desktop action menu
 */
export interface ActionMenuState {
  openMenuId: string | null;
  position: { top: number; left: number };
}

/**
 * State for the mobile action drawer
 */
export interface DrawerState {
  isOpen: boolean;
  selectedClient: Client | null;
}

/**
 * State for delete confirmation dialog
 */
export interface DeleteConfirmState {
  show: boolean;
  client: Client | null;
  isDeleting: boolean;
}

/**
 * State for nested dialogs (ClientDialog and ManageProjectsDialog)
 */
export interface NestedDialogsState {
  clientDialog: {
    isOpen: boolean;
    clientId?: string;
    mode: 'create' | 'view' | 'edit';
  };
  projectsDialog: {
    isOpen: boolean;
    client: Client | null;
  };
}

// ============================================================
// HOOK RETURN TYPE
// ============================================================

/**
 * Return type for useClientsDialog hook
 */
export interface UseClientsDialogReturn {
  // Data from store (reactive)
  clients: Client[];
  isLoading: boolean;

  // UI State
  actionMenu: ActionMenuState;
  drawer: DrawerState;
  deleteConfirm: DeleteConfirmState;
  nestedDialogs: NestedDialogsState;

  // Menu actions
  handleMenuOpen: (client: Client, buttonEl: HTMLButtonElement) => void;
  handleMenuClose: () => void;

  // CRUD actions
  handleEditClient: (client: Client) => void;
  handleCreateClient: () => void;
  handleManageProjects: (client: Client) => void;
  handleDeleteClick: (client: Client) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCloseDeleteConfirm: () => void;

  // Nested dialog handlers
  handleClientDialogChange: (open: boolean) => void;
  handleProjectsDialogChange: (open: boolean) => void;

  // Utilities
  getClientInitials: (name: string) => string;
  isMobile: boolean;
  menuRef: RefObject<HTMLDivElement>;
  setButtonRef: (clientId: string) => (el: HTMLButtonElement | null) => void;
}
