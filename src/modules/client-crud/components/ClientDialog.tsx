/**
 * Client Dialog Component
 * Main orchestrator for creating/viewing/editing clients
 * Modular structure following task-crud pattern
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { CrudDialog } from '@/modules/dialogs/components/organisms';
import { DestructiveConfirmDialog } from '@/modules/dialogs/components/variants';
import { clientService } from '../services/clientService';
import { useClientForm } from '../hooks/form/useClientForm';
import { ClientForm } from './forms/ClientForm';
import { ClientDialogActions } from './forms/ClientDialogActions';
import { ClientDialogProps } from '../types/form';
import { TOAST_MESSAGES } from '../config';
import { phoneToStorageString, type PhoneNumber } from '../utils/validation';
import { useDataStore } from '@/stores/dataStore';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { invalidateClientsCache } from '@/lib/cache-utils';

export function ClientDialog({
  isOpen,
  onOpenChange,
  onClientCreated,
  onClientUpdated,
  clientId,
  mode: initialMode = 'create',
}: ClientDialogProps) {
  // eslint-disable-next-line no-console
  // console.log('[ClientDialog] Rendering - isOpen:', isOpen, 'mode:', initialMode, 'clientId:', clientId);
  
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useSonnerToast();

  // Check if user is admin (check both 'role' and 'access' fields for compatibility)
  const isAdmin =
    user?.publicMetadata?.role === 'admin' ||
    user?.publicMetadata?.role === 'Admin' ||
    user?.publicMetadata?.access === 'admin' ||
    user?.publicMetadata?.access === 'Admin';

  // Get clients from dataStore (already loaded, no API call needed)
  const allClients = useDataStore((state) => state.clients);
  const setClients = useDataStore((state) => state.setClients);
  const removeClientFromStore = useClientsDataStore((state) => state.removeClient);

  // Find the client data from the store
  const clientFromStore = useMemo(() => {
    if (!clientId || initialMode === 'create') return null;
    return allClients.find((c) => c.id === clientId) || null;
  }, [clientId, initialMode, allClients]);

  // State
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form hook
  const {
    formData,
    errors,
    updateField,
    updateProject,
    addProject,
    removeProject,
    updatePhone,
    handleRFCBlur,
    validate,
    reset: resetForm,
    getClientInitials,
  } = useClientForm();

  // Load client data from store when in view/edit mode (instant, no API call)
  useEffect(() => {
    if (isOpen && clientFromStore && initialMode !== 'create' && !isDataLoaded) {
      // Update form with client data from store
      Object.entries(clientFromStore).forEach(([key, value]) => {
        if (key in formData) {
          updateField(key as keyof typeof formData, value);
        }
      });
      setIsDataLoaded(true);
    }
  }, [isOpen, clientFromStore, initialMode, isDataLoaded, formData, updateField]);

  // Sync mode with initialMode when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setIsDataLoaded(false);
    }
  }, [isOpen, resetForm]);

  // Handle gradient selection
  const handleGradientSelect = useCallback((gradientId: string, colors?: string[]) => {
    updateField('gradientId', gradientId);
    if (colors) {
      updateField('gradientColors', colors);
    }
  }, [updateField]);

  // Handle image upload from GradientAvatarSelector
  const handleImageUpload = useCallback((url: string) => {
    updateField('imageUrl', url);
  }, [updateField]);

  // Dialog close handler
  const handleDialogClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

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
      // Transform phone to storage format
      const phoneForStorage = formData.phone
        ? typeof formData.phone === 'string'
          ? formData.phone
          : phoneToStorageString(formData.phone as PhoneNumber)
        : undefined;

      const clientData = {
        ...formData,
        phone: phoneForStorage,
        projects: (formData.projects || []).filter((p) => p.trim()),
      };

      if (mode === 'create') {
        await clientService.createClient(clientData);
        showSuccess(`El cliente "${formData.name}" se ha creado exitosamente.`);
        if (onClientCreated) onClientCreated();
      } else if (mode === 'edit' && clientId) {
        await clientService.updateClient(clientId, clientData);
        showSuccess(`El cliente "${formData.name}" se ha actualizado exitosamente.`);
        if (onClientUpdated) onClientUpdated();
      }

      resetForm();
      onOpenChange(false);
      window.location.reload();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, user, formData, mode, clientId, validate, showSuccess, showError, onClientCreated, onClientUpdated, onOpenChange, resetForm]);

  const handleCancel = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleEdit = useCallback(() => {
    setMode('edit');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setMode('view');
    // Reload client data would go here
  }, []);

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
      // Call API to delete from Firestore
      await clientService.deleteClient(clientId);

      // Update clientsDataStore
      removeClientFromStore(clientId);

      // Update dataStore (legacy store)
      const updatedClients = allClients.filter((c) => c.id !== clientId);
      setClients(updatedClients);

      // Invalidate cache
      invalidateClientsCache();

      showSuccess('La cuenta ha sido eliminada exitosamente.');

      // Close dialogs
      setShowDeleteConfirm(false);
      onOpenChange(false);

      // Reload to refresh the list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al eliminar la cuenta: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  }, [isAdmin, clientId, removeClientFromStore, allClients, setClients, showSuccess, showError, onOpenChange]);

  // Dialog title/description
  const getTitle = () => {
    if (mode === 'create') return 'Crear Nueva Cuenta';
    if (mode === 'edit') return 'Editar Cuenta';
    return 'Información de la Cuenta';
  };

  const getDescription = () => {
    if (mode === 'create') return 'Completa el formulario para crear una nueva cuenta en el sistema.';
    if (mode === 'edit') return 'Actualiza la información de la cuenta.';
    return 'Detalles completos de la cuenta del cliente.';
  };

  const isReadOnly = mode === 'view';

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description={getDescription()}
      mode={mode === 'create' ? 'create' : 'view'}
      size="xl"
      isLoading={false}
      loadingMessage="Cargando información del cliente..."
      closeOnOverlayClick={false}
      closeOnEscape={true}
      showCloseButton={true}
      footer={null}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        <ClientForm
          formData={formData}
          errors={errors}
          isReadOnly={isReadOnly}
          isSubmitting={isSubmitting}
          isAdmin={isAdmin}
          clientId={clientId}
          clientInitials={getClientInitials()}
          onFieldChange={updateField}
          onGradientSelect={handleGradientSelect}
          onImageUpload={handleImageUpload}
          onProjectChange={updateProject}
          onAddProject={addProject}
          onRemoveProject={removeProject}
          onPhoneChange={updatePhone}
          onRFCBlur={handleRFCBlur}
        />
        
        <ClientDialogActions
          mode={mode}
          isSubmitting={isSubmitting}
          isDeleting={isDeleting}
          isAdmin={isAdmin}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          onEdit={handleEdit}
          onCancelEdit={handleCancelEdit}
          onClose={handleDialogClose}
          onDelete={clientId ? handleDeleteClick : undefined}
        />

        {/* Delete Confirmation Dialog */}
        <DestructiveConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Eliminar Cuenta"
          itemName={formData.name}
          warningMessage="Las tareas sin cuenta asignada no aparecerán en los filtros del sistema ni podrán ser relacionadas con otras tareas hasta ser reasignadas."
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      </div>
    </CrudDialog>
  );
}
