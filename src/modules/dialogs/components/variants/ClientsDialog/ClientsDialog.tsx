/**
 * Clients Management Dialog
 *
 * Admin-only dialog for viewing, creating, editing, and deleting clients.
 * Uses ResponsiveDialog for automatic drawer on mobile.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '../../DialogPrimitives';
import { DialogFooter } from '../../molecules';
import { DialogLoadingState } from '../../atoms';
import { DestructiveConfirmDialog } from '../DestructiveConfirmDialog';
import { panelVariants } from '../../../config/animations';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { ClientDialog } from '@/modules/client-crud/components/ClientDialog';
import { ManageProjectsDialog } from '../ManageProjectsDialog';
import { clientService } from '@/modules/client-crud/services/clientService';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { useDataStore } from '@/stores/dataStore';
import { invalidateClientsCache } from '@/lib/cache-utils';
import { Client } from '@/types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import styles from '../UsersDialog/UsersDialog.module.scss';
import clientStyles from './ClientsDialog.module.scss';
import {
  Plus,
  Building2,
  Mail,
  Globe,
  Briefcase,
  MoreHorizontal,
  Pencil,
  FolderPlus,
  Trash2,
} from 'lucide-react';

interface ClientsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientsDialog({ isOpen, onOpenChange }: ClientsDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // ClientDialog state
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [clientDialogMode, setClientDialogMode] = useState<'create' | 'view' | 'edit'>('create');

  // ManageProjectsDialog state
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [projectsDialogClient, setProjectsDialogClient] = useState<Client | null>(null);

  const { success: showSuccess, error: showError } = useSonnerToast();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Store actions
  const removeClientFromStore = useClientsDataStore((state) => state.removeClient);
  const setClientsInStore = useDataStore((state) => state.setClients);
  const allClientsFromStore = useDataStore((state) => state.clients);

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await clientService.listClients();

      if (response.success && response.data) {
        setClients(response.data.clients);
      } else {
        throw new Error('Error al obtener cuentas');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      showError('Error al cargar cuentas', 'No se pudieron obtener las cuentas del sistema');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load clients when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setOpenMenuId(null);
    }
  }, [isOpen, fetchClients]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openMenuId &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRefs.current.get(openMenuId)?.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Handle menu open
  const handleMenuOpen = useCallback((client: Client, buttonEl: HTMLButtonElement) => {
    if (isMobile) {
      setSelectedClient(client);
      setIsDrawerOpen(true);
    } else {
      const rect = buttonEl.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 160, // Align to right edge
      });
      setOpenMenuId(openMenuId === client.id ? null : client.id);
    }
  }, [isMobile, openMenuId]);

  // Handle edit client
  const handleEditClient = useCallback((client: Client) => {
    setSelectedClientId(client.id);
    setClientDialogMode('edit');
    setIsClientDialogOpen(true);
    setOpenMenuId(null);
    setIsDrawerOpen(false);
  }, []);

  // Handle create new client
  const handleCreateClient = useCallback(() => {
    setSelectedClientId(undefined);
    setClientDialogMode('create');
    setIsClientDialogOpen(true);
  }, []);

  // Handle manage projects - opens projects dialog
  const handleManageProjects = useCallback((client: Client) => {
    setProjectsDialogClient(client);
    setIsProjectsDialogOpen(true);
    setOpenMenuId(null);
    setIsDrawerOpen(false);
  }, []);

  // Handle delete client - show confirmation
  const handleDeleteClick = useCallback((client: Client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
    setIsDrawerOpen(false);
  }, []);

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!clientToDelete) return;

    setDeletingClientId(clientToDelete.id);

    try {
      await clientService.deleteClient(clientToDelete.id);

      // Remove from local state
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));

      // Remove from stores
      removeClientFromStore(clientToDelete.id);
      const updatedClients = allClientsFromStore.filter((c) => c.id !== clientToDelete.id);
      setClientsInStore(updatedClients);
      invalidateClientsCache();

      showSuccess(`Cuenta "${clientToDelete.name}" eliminada exitosamente`);
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      showError(
        'Error al eliminar cuenta',
        error instanceof Error ? error.message : 'No se pudo eliminar la cuenta'
      );
    } finally {
      setDeletingClientId(null);
    }
  }, [clientToDelete, removeClientFromStore, allClientsFromStore, setClientsInStore, showSuccess, showError]);

  // Handle ClientDialog close and refresh
  const handleClientDialogChange = useCallback((open: boolean) => {
    setIsClientDialogOpen(open);
    if (!open) {
      fetchClients();
    }
  }, [fetchClients]);

  // Get client initials for avatar placeholder
  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render action menu for desktop
  const renderActionMenu = (client: Client) => {
    if (openMenuId !== client.id || isMobile) return null;

    return createPortal(
      <AnimatePresence>
        <motion.div
          ref={menuRef}
          className={clientStyles.actionMenu}
          style={{ top: menuPosition.top, left: menuPosition.left }}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={clientStyles.menuItem}
            onClick={() => handleEditClient(client)}
          >
            <Pencil size={16} />
            Editar cuenta
          </button>
          <button
            className={clientStyles.menuItem}
            onClick={() => handleManageProjects(client)}
          >
            <FolderPlus size={16} />
            Gestionar proyectos
          </button>
          <div className={clientStyles.menuSeparator} />
          <button
            className={`${clientStyles.menuItem} ${clientStyles.menuItemDanger}`}
            onClick={() => handleDeleteClick(client)}
          >
            <Trash2 size={16} />
            Eliminar cuenta
          </button>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

  // Render client list
  const renderClientList = () => {
    if (clients.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Building2 size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No hay cuentas en el sistema</p>
          <p className={styles.emptySubtext}>Crea una nueva cuenta para comenzar</p>
        </div>
      );
    }

    return (
      <div className={styles.userList}>
        {clients.map((client) => {
          const isDeleting = deletingClientId === client.id;

          return (
            <motion.div
              key={client.id}
              className={styles.userItem}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isDeleting ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.userAvatar}>
                {client.imageUrl && !client.imageUrl.includes('empty-image') ? (
                  <Image
                    src={client.imageUrl}
                    alt={client.name}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div
                    className={styles.avatarPlaceholder}
                    style={client.gradientColors ? {
                      background: `linear-gradient(135deg, ${client.gradientColors[0]} 0%, ${client.gradientColors[1]} 50%, ${client.gradientColors[2]} 100%)`
                    } : undefined}
                  >
                    {!client.gradientColors && getClientInitials(client.name)}
                  </div>
                )}
              </div>

              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {client.name}
                  {client.industry && (
                    <span className={styles.adminBadge}>
                      <Briefcase size={10} />
                      {client.industry}
                    </span>
                  )}
                </div>
                <div className={styles.userEmail}>
                  {client.email ? (
                    <>
                      <Mail size={12} />
                      {client.email}
                    </>
                  ) : client.website ? (
                    <>
                      <Globe size={12} />
                      {client.website}
                    </>
                  ) : (
                    <>
                      <Building2 size={12} />
                      {client.projects?.length || 0} proyecto{(client.projects?.length || 0) !== 1 ? 's' : ''}
                    </>
                  )}
                </div>
              </div>

              {/* Action button */}
              <button
                ref={(el) => {
                  if (el) buttonRefs.current.set(client.id, el);
                }}
                className={clientStyles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(client, e.currentTarget);
                }}
                disabled={isDeleting}
                aria-label={`Acciones para ${client.name}`}
              >
                {isDeleting ? (
                  <span className={styles.spinner} />
                ) : (
                  <MoreHorizontal size={18} />
                )}
              </button>

              {/* Desktop action menu */}
              {renderActionMenu(client)}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Loading state
  if (isLoading && isOpen) {
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent size="lg">
          <DialogLoadingState message="Cargando cuentas..." />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          size="lg"
          closeOnOverlayClick={false}
          showCloseButton={true}
        >
          {isMobile ? (
            // Mobile layout
            <>
              <ResponsiveDialogHeader>
                <div className={styles.header}>
                  <ResponsiveDialogTitle>Gestión de Cuentas</ResponsiveDialogTitle>
                </div>
                <p className={styles.userCount}>
                  <Building2 size={14} />
                  {clients.length} cuenta{clients.length !== 1 ? 's' : ''} en el sistema
                </p>
              </ResponsiveDialogHeader>

              <ResponsiveDialogBody>
                {renderClientList()}
              </ResponsiveDialogBody>

              <ResponsiveDialogFooter>
                <button
                  className={clientStyles.createButtonDiscrete}
                  onClick={handleCreateClient}
                >
                  <Plus size={18} />
                  Crear nueva cuenta
                </button>
              </ResponsiveDialogFooter>
            </>
          ) : (
            // Desktop layout
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.dialogInner}
                >
                  {/* Accessible title for screen readers */}
                  <ResponsiveDialogTitle className="sr-only">
                    Gestión de Cuentas
                  </ResponsiveDialogTitle>

                  <div className={styles.header}>
                    <div className={styles.headerTitle}>
                      <Building2 size={24} className={styles.headerIcon} />
                      <div>
                        <h2 className={styles.title} aria-hidden="true">Gestión de Cuentas</h2>
                        <p className={styles.userCount}>
                          <Building2 size={14} />
                          {clients.length} cuenta{clients.length !== 1 ? 's' : ''} en el sistema
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.content}>
                    {renderClientList()}
                  </div>

                  <DialogFooter>
                    <button
                      className={clientStyles.createButtonDiscrete}
                      onClick={handleCreateClient}
                    >
                      <Plus size={18} />
                      Crear nueva cuenta
                    </button>
                  </DialogFooter>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Mobile action drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent compact>
          <DrawerHeader>
            <DrawerTitle>Acciones de Cuenta</DrawerTitle>
          </DrawerHeader>
          <div className={clientStyles.drawerBody}>
            <button
              className={clientStyles.drawerItem}
              onClick={() => selectedClient && handleEditClient(selectedClient)}
            >
              <Pencil size={20} />
              <span>Editar cuenta</span>
            </button>
            <button
              className={clientStyles.drawerItem}
              onClick={() => selectedClient && handleManageProjects(selectedClient)}
            >
              <FolderPlus size={20} />
              <span>Gestionar proyectos</span>
            </button>
            <div className={clientStyles.drawerSeparator} />
            <button
              className={`${clientStyles.drawerItem} ${clientStyles.drawerItemDanger}`}
              onClick={() => selectedClient && handleDeleteClick(selectedClient)}
            >
              <Trash2 size={20} />
              <span>Eliminar cuenta</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation dialog */}
      <DestructiveConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar Cuenta"
        itemName={clientToDelete?.name || ''}
        warningMessage="Esta acción eliminará permanentemente la cuenta. Las tareas asociadas perderán su referencia de cliente."
        onConfirm={handleConfirmDelete}
        isLoading={deletingClientId !== null}
      />

      {/* Client CRUD Dialog */}
      <ClientDialog
        isOpen={isClientDialogOpen}
        onOpenChange={handleClientDialogChange}
        clientId={selectedClientId}
        mode={clientDialogMode}
        onClientCreated={fetchClients}
        onClientUpdated={fetchClients}
      />

      {/* Manage Projects Dialog */}
      {projectsDialogClient && (
        <ManageProjectsDialog
          isOpen={isProjectsDialogOpen}
          onOpenChange={setIsProjectsDialogOpen}
          client={projectsDialogClient}
          onProjectsUpdated={fetchClients}
        />
      )}
    </>
  );
}
