/**
 * Client Dialog Component
 * Main orchestrator for creating/viewing/editing clients
 * Modular structure following task-crud pattern
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { CrudDialog } from '@/modules/dialogs/components/organisms';
import { clientService } from '../services/clientService';
import { useClientForm } from '../hooks/form/useClientForm';
import { useImageUpload } from '../hooks/ui/useImageUpload';
import { ClientForm } from './forms/ClientForm';
import { ClientDialogActions } from './forms/ClientDialogActions';
import { ClientDialogProps } from '../types/form';
import { UI_CONSTANTS, TOAST_MESSAGES } from '../config';

export function ClientDialog({
  isOpen,
  onOpenChange,
  onClientCreated,
  onClientUpdated,
  clientId,
  mode: initialMode = 'create',
}: ClientDialogProps) {
  // eslint-disable-next-line no-console
  console.log('[ClientDialog] Rendering - isOpen:', isOpen, 'mode:', initialMode, 'clientId:', clientId);
  
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useSonnerToast();

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'Admin';

  // State
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(false);

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
  } = useClientForm();

  // Image upload hook
  const {
    imageFile,
    imagePreview,
    handleImageChange,
    resetImage,
    setPreview,
  } = useImageUpload({
    onError: showError,
  });

  // Load client data when in view/edit mode
  const loadClientData = useCallback(async () => {
    // Wait for user to be loaded before making authenticated requests
    if (!clientId || mode === 'create' || !user || isLoadingClient) return;

    try {
      setIsLoadingClient(true);
      const response = await clientService.getClient(clientId);

      if (!response.success || !response.data) {
        showError('No se pudo cargar la información del cliente.');
        setIsLoadingClient(false);
        return;
      }

      const client = response.data;

      // Update form with client data
      Object.entries(client).forEach(([key, value]) => {
        if (key in formData) {
          updateField(key as keyof typeof formData, value);
        }
      });

      if (client.imageUrl) {
        setPreview(client.imageUrl);
      }

      setIsLoadingClient(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(errorMessage);
      setIsLoadingClient(false);
    }
  }, [clientId, mode, user, isLoadingClient, showError, updateField, setPreview, formData]);

  useEffect(() => {
    if (isOpen && clientId && mode !== 'create') {
      loadClientData();
    }
  }, [isOpen, clientId, mode, loadClientData]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      resetImage();
      setMode(initialMode);
    }
  }, [isOpen, initialMode, resetForm, resetImage]);

  // Image click handler
  const handleImageClick = useCallback(() => {
    document.getElementById('client-image-input')?.click();
  }, []);

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
      // Upload image if new file is provided
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);
        uploadFormData.append('userId', user.id);
        uploadFormData.append('type', 'profile');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
          headers: { 'x-clerk-user-id': user.id },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const { url } = await response.json();
        imageUrl = url;
      }

      const clientData = {
        ...formData,
        imageUrl: imageUrl !== UI_CONSTANTS.IMAGE_PREVIEW_DEFAULT ? imageUrl : undefined,
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
      resetImage();
      onOpenChange(false);
      window.location.reload();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, user, formData, imageFile, mode, clientId, validate, showSuccess, showError, onClientCreated, onClientUpdated, onOpenChange, resetForm, resetImage]);

  const handleCancel = useCallback(() => {
    resetForm();
    resetImage();
    onOpenChange(false);
  }, [resetForm, resetImage, onOpenChange]);

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
      isLoading={isLoadingClient}
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
          imagePreview={imagePreview}
          isReadOnly={isReadOnly}
          isSubmitting={isSubmitting}
          isAdmin={isAdmin}
          clientId={clientId}
          onFieldChange={updateField}
          onImageClick={handleImageClick}
          onImageChange={handleImageChange}
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
