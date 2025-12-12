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
import { clientService } from '../services/clientService';
import { useClientForm } from '../hooks/form/useClientForm';
import { ClientForm } from './forms/ClientForm';
import { ClientDialogActions } from './forms/ClientDialogActions';
import { ClientDialogProps } from '../types/form';
import { TOAST_MESSAGES } from '../config';
import { useDataStore } from '@/stores/dataStore';

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

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'Admin';

  // Get clients from dataStore (already loaded, no API call needed)
  const allClients = useDataStore((state) => state.clients);

  // Find the client data from the store
  const clientFromStore = useMemo(() => {
    if (!clientId || initialMode === 'create') return null;
    return allClients.find((c) => c.id === clientId) || null;
  }, [clientId, initialMode, allClients]);

  // State
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Form hook
  const {
    formData,
    errors,
    updateField,
    updateProject,
    addProject,
    removeProject,
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
  const handleGradientSelect = useCallback((gradientId: string) => {
    updateField('gradientId', gradientId);
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
      const clientData = {
        ...formData,
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
        />
        
        <ClientDialogActions
          mode={mode}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          onEdit={handleEdit}
          onCancelEdit={handleCancelEdit}
          onClose={handleDialogClose}
        />
      </div>
    </CrudDialog>
  );
}
