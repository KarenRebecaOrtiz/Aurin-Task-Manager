/**
 * Client Dialog Component
 *
 * Uses ResponsiveDialog system for automatic drawer on mobile.
 * Simplified UX - no separate view/edit modes, directly editable.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { DestructiveConfirmDialog } from '@/modules/dialogs/components/variants';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@/modules/dialogs/components/DialogPrimitives';
import { Button } from '@/components/ui/buttons';
import { Trash2 } from 'lucide-react';
import { clientService } from '../services/clientService';
import { useClientForm } from '../hooks/form/useClientForm';
import { ClientFormSimple } from './forms/ClientFormSimple';
import { ClientDialogProps } from '../types/form';
import { TOAST_MESSAGES } from '../config';
import { useDataStore } from '@/stores/dataStore';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { invalidateClientsCache } from '@/lib/cache-utils';
import styles from './ClientDialog.module.scss';

export function ClientDialog({
  isOpen,
  onOpenChange,
  onClientCreated,
  onClientUpdated,
  clientId,
  mode: initialMode = 'create',
}: ClientDialogProps) {
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useSonnerToast();

  // Check if user is admin
  const isAdmin =
    user?.publicMetadata?.role === 'admin' ||
    user?.publicMetadata?.role === 'Admin' ||
    user?.publicMetadata?.access === 'admin' ||
    user?.publicMetadata?.access === 'Admin';

  // Get clients from dataStore
  const allClients = useDataStore((state) => state.clients);
  const setClients = useDataStore((state) => state.setClients);
  const addClient = useDataStore((state) => state.addClient);
  const updateClientInStore = useDataStore((state) => state.updateClient);
  const removeClientFromStore = useClientsDataStore((state) => state.removeClient);
  const setClientsInClientsStore = useClientsDataStore((state) => state.setClients);

  // Find the client data from the store
  const clientFromStore = useMemo(() => {
    if (!clientId || initialMode === 'create') return null;
    return allClients.find((c) => c.id === clientId) || null;
  }, [clientId, initialMode, allClients]);

  // Determine if this is create mode
  const isCreateMode = initialMode === 'create' || !clientId;

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form hook with change tracking
  const {
    formData,
    errors,
    updateField,
    handleRFCBlur,
    validate,
    reset: resetForm,
    setInitialData,
    discardChanges,
    hasChanges,
  } = useClientForm();

  // Check if there are unsaved changes
  const formHasChanges = useMemo(() => {
    if (isCreateMode) {
      return formData.name.trim().length > 0;
    }
    return hasChanges();
  }, [isCreateMode, formData.name, hasChanges]);

  // Load client data from store when opening for existing client
  useEffect(() => {
    if (isOpen && clientFromStore && !isCreateMode && !isDataLoaded) {
      setInitialData(clientFromStore);
      setIsDataLoaded(true);
    }
  }, [isOpen, clientFromStore, isCreateMode, isDataLoaded, setInitialData]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setIsDataLoaded(false);
    }
  }, [isOpen, resetForm]);

  // Handle gradient selection - clears imageUrl for mutual exclusivity
  // Exception: 'custom-image' is used when uploading an image, so don't clear imageUrl in that case
  const handleGradientSelect = useCallback((gradientId: string, colors?: string[]) => {
    updateField('gradientId', gradientId);
    if (colors) {
      updateField('gradientColors', colors);
    }
    // Clear image when selecting gradient (mutual exclusivity)
    // But NOT when selecting 'custom-image' - that's used for uploaded images
    if (gradientId !== 'custom-image') {
      updateField('imageUrl', '');
    }
  }, [updateField]);

  // Handle image upload - clears gradient for mutual exclusivity
  const handleImageUpload = useCallback((url: string) => {
    updateField('imageUrl', url);
    // Clear gradient when uploading image (mutual exclusivity)
    updateField('gradientId', '');
    updateField('gradientColors', []);
  }, [updateField]);

  // Close handler - check for unsaved changes
  const handleClose = useCallback((open: boolean) => {
    if (!open && formHasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(open);
    }
  }, [formHasChanges, onOpenChange]);

  // Force close without checking changes
  const handleForceClose = useCallback(() => {
    setShowDiscardConfirm(false);
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // Discard changes handler
  const handleDiscardChanges = useCallback(() => {
    if (isCreateMode) {
      handleForceClose();
    } else {
      discardChanges();
      setShowDiscardConfirm(false);
    }
  }, [isCreateMode, handleForceClose, discardChanges]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (!user) {
      showError(TOAST_MESSAGES.SESSION_EXPIRED.description);
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform phone to string if needed
      const phoneForStorage = typeof formData.phone === 'string'
        ? formData.phone
        : formData.phone?.number || '';

      const clientData = {
        ...formData,
        phone: phoneForStorage,
      };

      if (isCreateMode) {
        const response = await clientService.createClient(clientData);

        // Update stores with the new client
        if (response.success && response.data) {
          addClient(response.data);
          // Also update clientsDataStore by refreshing all clients
          const updatedClients = [...allClients, response.data];
          setClientsInClientsStore(updatedClients);
          invalidateClientsCache();
        }

        showSuccess(`La cuenta "${formData.name}" se ha creado exitosamente.`);
        if (onClientCreated) onClientCreated();
      } else if (clientId) {
        const response = await clientService.updateClient(clientId, clientData);

        // Update stores with the updated client
        if (response.success && response.data) {
          updateClientInStore(clientId, response.data);
          // Also update clientsDataStore
          const updatedClients = allClients.map((c) =>
            c.id === clientId ? response.data! : c
          );
          setClientsInClientsStore(updatedClients);
          invalidateClientsCache();
        }

        showSuccess(`La cuenta "${formData.name}" se ha actualizado exitosamente.`);
        if (onClientUpdated) onClientUpdated();
      }

      resetForm();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, user, formData, isCreateMode, clientId, validate, showSuccess, showError, onClientCreated, onClientUpdated, onOpenChange, resetForm, addClient, updateClientInStore, allClients, setClientsInClientsStore]);

  // Delete handlers
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!isAdmin || !clientId) {
      showError('Solo los administradores pueden eliminar cuentas.');
      return;
    }

    setIsDeleting(true);

    try {
      await clientService.deleteClient(clientId);
      removeClientFromStore(clientId);

      const updatedClients = allClients.filter((c) => c.id !== clientId);
      setClients(updatedClients);
      invalidateClientsCache();

      showSuccess('La cuenta ha sido eliminada exitosamente.');
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al eliminar la cuenta: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  }, [isAdmin, clientId, removeClientFromStore, allClients, setClients, showSuccess, showError, onOpenChange]);

  const isDisabled = isSubmitting || isDeleting;

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={handleClose}>
        <ResponsiveDialogContent
          size="lg"
          closeOnOverlayClick={!formHasChanges}
          showCloseButton={true}
        >
          {/* Accessible title for screen readers */}
          <ResponsiveDialogTitle className="sr-only">
            {isCreateMode ? 'Crear Cliente' : 'Editar Cliente'}
          </ResponsiveDialogTitle>

          {/* Scrollable Content */}
          <ResponsiveDialogBody className={styles.content}>
            <ClientFormSimple
              formData={formData}
              errors={errors}
              isSubmitting={isSubmitting}
              onFieldChange={updateField}
              onGradientSelect={handleGradientSelect}
              onImageUpload={handleImageUpload}
              onRFCBlur={handleRFCBlur}
            />
          </ResponsiveDialogBody>

          {/* Fixed Footer */}
          <ResponsiveDialogFooter className={styles.footer}>
            <div className={styles.actions}>
              {isCreateMode ? (
                <>
                  <Button
                    intent="secondary"
                    onClick={handleForceClose}
                    disabled={isDisabled}
                  >
                    Cancelar
                  </Button>
                  <Button
                    intent="primary"
                    onClick={handleSubmit}
                    disabled={isDisabled || !formData.name.trim()}
                    isLoading={isSubmitting}
                    loadingText="Guardando..."
                  >
                    Guardar
                  </Button>
                </>
              ) : (
                <>
                  {isAdmin && clientId && (
                    <Button
                      intent="danger"
                      onClick={handleDeleteClick}
                      disabled={isDisabled}
                      leftIcon={Trash2}
                    >
                      Eliminar cuenta
                    </Button>
                  )}
                  <Button
                    intent="primary"
                    onClick={handleSubmit}
                    disabled={isDisabled || !formHasChanges}
                    isLoading={isSubmitting}
                    loadingText="Guardando..."
                  >
                    Guardar cambios
                  </Button>
                </>
              )}
            </div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar Cuenta"
        itemName={formData.name}
        warningMessage="Esta acción eliminará permanentemente la cuenta. Las tareas asociadas perderán su referencia de cliente."
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      {/* Discard Changes Confirmation Dialog */}
      <DestructiveConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Descartar Cambios"
        itemName="los cambios realizados"
        warningMessage="Perderás todos los cambios que no hayas guardado."
        onConfirm={handleDiscardChanges}
        confirmText="Descartar"
        isLoading={false}
      />
    </>
  );
}
