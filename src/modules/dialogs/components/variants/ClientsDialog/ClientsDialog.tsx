/**
 * ClientsDialog Component
 *
 * Admin-only dialog for viewing, creating, editing, and deleting clients.
 * Uses ResponsiveDialog for automatic drawer on mobile.
 *
 * Architecture:
 * - Uses useClientsDialog hook for all logic
 * - Data comes from global stores (reactive)
 * - Modular components for list, menu, and drawer
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2 } from 'lucide-react';
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
import { ClientDialog } from '@/modules/client-crud/components/ClientDialog';
import { ManageProjectsDialog } from '../ManageProjectsDialog';

// Local components
import {
  ClientListItem,
  ClientEmptyState,
  ClientActionMenu,
  ClientActionDrawer,
} from './components';

// Hook with all logic
import { useClientsDialog } from './hooks';

// Types
import { ClientsDialogProps } from './types';

// Styles
import styles from '../UsersDialog/UsersDialog.module.scss';
import clientStyles from './ClientsDialog.module.scss';

export function ClientsDialog({ isOpen, onOpenChange }: ClientsDialogProps) {
  const {
    // Data from store
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
  } = useClientsDialog(isOpen);

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

  // Render client list or empty state
  const renderClientList = () => {
    if (clients.length === 0) {
      return <ClientEmptyState />;
    }

    return (
      <div className={styles.userList}>
        {clients.map((client) => (
          <ClientListItem
            key={client.id}
            client={client}
            isDeleting={
              deleteConfirm.client?.id === client.id && deleteConfirm.isDeleting
            }
            onMenuOpen={handleMenuOpen}
            buttonRef={setButtonRef(client.id)}
            getClientInitials={getClientInitials}
          />
        ))}
      </div>
    );
  };

  // Get selected client for action menu
  const selectedClientForMenu = actionMenu.openMenuId
    ? clients.find((c) => c.id === actionMenu.openMenuId)
    : null;

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          size="lg"
          closeOnOverlayClick={false}
          showCloseButton
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
                  {clients.length} cuenta{clients.length !== 1 ? 's' : ''} en el
                  sistema
                </p>
              </ResponsiveDialogHeader>

              <ResponsiveDialogBody>{renderClientList()}</ResponsiveDialogBody>

              <ResponsiveDialogFooter>
                <button
                  className={clientStyles.createButtonDiscrete}
                  onClick={handleCreateClient}
                >
                  <Plus size={18} strokeWidth={1.5} />
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
                        <h2 className={styles.title} aria-hidden="true">
                          Gestión de Cuentas
                        </h2>
                        <p className={styles.userCount}>
                          <Building2 size={14} />
                          {clients.length} cuenta{clients.length !== 1 ? 's' : ''}{' '}
                          en el sistema
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.content}>{renderClientList()}</div>

                  <DialogFooter>
                    <button
                      className={clientStyles.createButtonDiscrete}
                      onClick={handleCreateClient}
                    >
                      <Plus size={18} strokeWidth={1.5} />
                      Crear nueva cuenta
                    </button>
                  </DialogFooter>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Desktop Action Menu */}
      {selectedClientForMenu && !isMobile && (
        <ClientActionMenu
          ref={menuRef}
          client={selectedClientForMenu}
          position={actionMenu.position}
          onEdit={() => handleEditClient(selectedClientForMenu)}
          onManageProjects={() => handleManageProjects(selectedClientForMenu)}
          onDelete={() => handleDeleteClick(selectedClientForMenu)}
          onClose={handleMenuClose}
        />
      )}

      {/* Mobile Action Drawer */}
      <ClientActionDrawer
        isOpen={drawer.isOpen}
        onOpenChange={(open) => !open && handleMenuClose()}
        client={drawer.selectedClient}
        onEdit={() =>
          drawer.selectedClient && handleEditClient(drawer.selectedClient)
        }
        onManageProjects={() =>
          drawer.selectedClient && handleManageProjects(drawer.selectedClient)
        }
        onDelete={() =>
          drawer.selectedClient && handleDeleteClick(drawer.selectedClient)
        }
      />

      {/* Delete Confirmation */}
      <DestructiveConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && handleCloseDeleteConfirm()}
        title="Eliminar Cuenta"
        itemName={deleteConfirm.client?.name || ''}
        warningMessage="Esta acción eliminará permanentemente la cuenta. Las tareas asociadas perderán su referencia de cliente."
        onConfirm={handleConfirmDelete}
        isLoading={deleteConfirm.isDeleting}
      />

      {/* Client CRUD Dialog */}
      <ClientDialog
        isOpen={nestedDialogs.clientDialog.isOpen}
        onOpenChange={handleClientDialogChange}
        clientId={nestedDialogs.clientDialog.clientId}
        mode={nestedDialogs.clientDialog.mode}
      />

      {/* Manage Projects Dialog */}
      {nestedDialogs.projectsDialog.client && (
        <ManageProjectsDialog
          isOpen={nestedDialogs.projectsDialog.isOpen}
          onOpenChange={handleProjectsDialogChange}
          client={nestedDialogs.projectsDialog.client}
        />
      )}
    </>
  );
}
