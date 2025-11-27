/**
 * Client Dialog Component
 * Main orchestrator for creating/viewing/editing clients
 * Modular structure following task-crud pattern
 */

'use client';

import { Dialog, DialogContent, DialogTitle } from '@/modules/dialogs';
import { VisuallyHidden } from '@/components/ui';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { DialogHeaderMolecule as DialogHeader } from '@/modules/dialogs';
import { clientService } from '../services/clientService';
import { useClientForm } from '../hooks/form/useClientForm';
import { useImageUpload } from '../hooks/ui/useImageUpload';
import { ClientForm } from './forms/ClientForm';
import { ClientDialogActions } from './forms/ClientDialogActions';
import { ClientDialogProps } from '../types/form';
import { UI_CONSTANTS, TOAST_MESSAGES } from '../config';
import styles from '@/modules/dialogs/styles/unified.module.scss';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

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
  useEffect(() => {
    if (!isOpen || !clientId || mode === 'create') return;

    const loadClientData = async () => {
      try {
        setIsLoadingClient(true);
        const response = await clientService.getClient(clientId);

        if (!response.success || !response.data) {
          showError('Cliente no encontrado', 'No se pudo cargar la información del cliente.');
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
        showError('Error al cargar el cliente', errorMessage);
        setIsLoadingClient(false);
      }
    };

    loadClientData();
  }, [isOpen, clientId, mode, showError, updateField, setPreview, formData]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      resetImage();
      setMode(initialMode);
    }
  }, [isOpen, initialMode, resetForm, resetImage]);

  // Event handlers
  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleDialogPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handlePointerDownOutside = useCallback((event: CustomEvent<{ originalEvent: PointerEvent }>) => {
    event.preventDefault();
  }, []);

  const handleInteractOutside = useCallback((event: CustomEvent<{ originalEvent: Event }>) => {
    event.preventDefault();
  }, []);

  // Image click handler
  const handleImageClick = useCallback(() => {
    document.getElementById('client-image-input')?.click();
  }, []);

  // Dialog close handler  
  const handleDialogClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Empty handler
  const handleNext = useCallback(() => {
    // No action needed
  }, []);

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
      showError(
        mode === 'create' ? 'No se pudo crear el cliente' : 'No se pudo actualizar el cliente',
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData, imageFile, mode, clientId, validate, showSuccess, showError, onClientCreated, onClientUpdated, onOpenChange, resetForm, resetImage]);

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

  // Loading state
  if (isLoadingClient) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className={`${styles.dialogContent} ${styles.sizeXl} flex flex-col h-[90vh] p-0 gap-0 overflow-hidden`}>
          <VisuallyHidden>
            <DialogTitle>Cargando cliente</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500">Cargando información del cliente...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${styles.dialogContent} ${styles.sizeXl} flex flex-col h-[90vh] p-0 gap-0 overflow-hidden`}
        onClick={handleDialogClick}
        onPointerDown={handleDialogPointerDown}
        onKeyDown={handleDialogKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
      >
        <VisuallyHidden>
          <DialogTitle>{getTitle()}</DialogTitle>
        </VisuallyHidden>

        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full flex flex-col flex-1"
            >
              <div className="flex-1 px-6 pb-6 overflow-y-auto flex flex-col">
                <DialogHeader title={getTitle()} description={getDescription()} />

                <ClientForm
                  currentStep={0}
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
                  footer={
                    <ClientDialogActions
                      mode={mode}
                      currentStep={0}
                      totalSteps={1}
                      isSubmitting={isSubmitting}
                      onBack={handleNext}
                      onNext={handleNext}
                      onCancel={handleCancel}
                      onSubmit={handleSubmit}
                      onEdit={handleEdit}
                      onCancelEdit={handleCancelEdit}
                      onClose={handleDialogClose}
                    />
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
