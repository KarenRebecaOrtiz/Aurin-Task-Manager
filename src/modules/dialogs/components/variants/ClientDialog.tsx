/**
 * Client Dialog Component
 * Main orchestrator for creating/viewing/editing clients
 * Uses CrudDialog as base component
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { CrudDialog } from '../organisms/CrudDialog';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { clientService } from '@/modules/client-crud/services/clientService';
import { useClientForm } from '@/modules/client-crud/hooks/form/useClientForm';
import { ClientForm } from '@/modules/client-crud/components/forms/ClientForm';
import { ClientDialogActions } from '@/modules/client-crud/components/forms/ClientDialogActions';
import { ClientDialogProps } from '@/modules/client-crud/types/form';
import { TOAST_MESSAGES } from '@/modules/client-crud/config';
import { phoneToStorageString, type PhoneNumber } from '@/modules/client-crud/utils/validation';

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
  const isAdmin = user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'Admin';

  // State
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [clientDataLoaded, setClientDataLoaded] = useState(false);

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


  // Load client data when in view/edit mode - ONLY ONCE when dialog opens
  useEffect(() => {
    // Skip if not open, no clientId, create mode, or already loaded
    if (!isOpen || !clientId || mode === 'create' || clientDataLoaded) return;

    let isMounted = true;

    const loadClientData = async () => {
      try {
        setIsLoadingClient(true);
        const response = await clientService.getClient(clientId);

        if (!isMounted) return;

        if (!response.success || !response.data) {
          showError('Cliente no encontrado', 'No se pudo cargar la información del cliente.');
          setIsLoadingClient(false);
          return;
        }

        const client = response.data;

        // Valid form fields - static list to avoid using formData as dependency
        const validFields = [
          'name', 'email', 'phone', 'address', 'industry', 
          'website', 'taxId', 'notes', 'imageUrl', 'projects', 
          'isActive', 'createdAt', 'createdBy', 'lastModified', 'lastModifiedBy'
        ];

        // Update form with client data
        Object.entries(client).forEach(([key, value]) => {
          if (validFields.includes(key)) {
            updateField(key as keyof typeof formData, value as never);
          }
        });

        setClientDataLoaded(true);
        setIsLoadingClient(false);
      } catch (error: unknown) {
        if (!isMounted) return;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        showError('Error al cargar el cliente', errorMessage);
        setIsLoadingClient(false);
      }
    };

    loadClientData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clientId, mode, clientDataLoaded]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setMode(initialMode);
      setClientDataLoaded(false); // Reset loaded flag when dialog closes
    }
  }, [isOpen, initialMode, resetForm]);

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
    if (!user) {
      showError(TOAST_MESSAGES.SESSION_EXPIRED.title, TOAST_MESSAGES.SESSION_EXPIRED.description);
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform phone to storage format before sending to API
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(
        mode === 'create' ? 'No se pudo crear el cliente' : 'No se pudo actualizar el cliente',
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData, mode, clientId, validate, showSuccess, showError, onClientCreated, onClientUpdated, onOpenChange, resetForm]);

  const handleCancel = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleEdit = useCallback(() => {
    setMode('edit');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setMode('view');
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

  // Custom footer with ClientDialogActions
  const customFooter = (
    <ClientDialogActions
      mode={mode}
      isSubmitting={isSubmitting}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      onEdit={handleEdit}
      onCancelEdit={handleCancelEdit}
      onClose={handleDialogClose}
    />
  );

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      mode={mode}
      title={getTitle()}
      description={getDescription()}
      isLoading={isLoadingClient}
      isSubmitting={isSubmitting}
      loadingMessage="Cargando información del cliente..."
      footer={customFooter}
      size="xl"
      closeOnOverlayClick={false}
    >
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
    </CrudDialog>
  );
}
