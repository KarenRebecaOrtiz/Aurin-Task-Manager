import React, { useEffect } from 'react';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useShallow } from 'zustand/react/shallow';
import { doc, deleteDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@clerk/nextjs';
import { useDataStore } from '@/stores/dataStore';
import { useModal } from '@/modules/modal';
import { useSonnerToast } from '@/modules/sonner';
import { AccountDetailsCard } from '@/modules/data-views/clients/components/modals';

export default function TasksPageModals() {
  const { user } = useUser();
  const { openModal, closeModal } = useModal();
  const { success, error } = useSonnerToast();
  
  // Optimized selectors to prevent unnecessary re-renders
  const deleteTarget = useTasksPageStore(useShallow(state => state.deleteTarget));
  const isDeletePopupOpen = useTasksPageStore(useShallow(state => state.isDeletePopupOpen));
  const isDeleteClientOpen = useTasksPageStore(useShallow(state => state.isDeleteClientOpen));
  const isConfirmExitOpen = useTasksPageStore(useShallow(state => state.isConfirmExitOpen));
  const isClientSidebarOpen = useTasksPageStore(useShallow(state => state.isClientSidebarOpen));
  const clientSidebarData = useTasksPageStore(useShallow(state => state.clientSidebarData));
  const isClientLoading = useTasksPageStore(useShallow(state => state.isClientLoading));
  const deleteConfirm = useTasksPageStore(useShallow(state => state.deleteConfirm));
  // Removed session revoke popup - not implemented in store

  // Action handlers
  const handleConfirmExit = () => {
    console.log('[TasksPageModals] handleConfirmExit called');
    const { setIsConfirmExitOpen, closeCreateTask, closeEditTask, setHasUnsavedChanges, pendingContainer, setContainer, setPendingContainer } = useTasksPageStore.getState();
    setIsConfirmExitOpen(false);
    closeCreateTask();
    closeEditTask();
    setHasUnsavedChanges(false);
    
    // Si hay un container pendiente, cambiar a él
    if (pendingContainer) {
      setContainer(pendingContainer);
      setPendingContainer(null);
    }
  };

  const handleCancelExit = () => {
    console.log('[TasksPageModals] handleCancelExit called');
    const { setIsConfirmExitOpen, setPendingContainer } = useTasksPageStore.getState();
    setIsConfirmExitOpen(false);
    setPendingContainer(null);
  };

  const handleClientSidebarClose = () => {
    console.log('[TasksPageModals] handleClientSidebarClose called');
    const { setIsClientSidebarOpen, setClientSidebarData } = useTasksPageStore.getState();
    setIsClientSidebarOpen(false);
    setClientSidebarData(null);
  };

  const handleClientSubmit = async (clientData: any) => {
    console.log('[TasksPageModals] handleClientSubmit called', clientData);

    try {
      const { setIsClientLoading } = useTasksPageStore.getState();
      setIsClientLoading(true);

      const dataToSave = {
        name: clientData.name,
        imageUrl: clientData.imageUrl,
        projectCount: clientData.projects?.length || 0,
        projects: clientData.projects || [],
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        industry: clientData.industry || '',
        website: clientData.website || '',
        taxId: clientData.taxId || '',
        notes: clientData.notes || '',
        isActive: clientData.isActive ?? true,
        createdBy: clientData.createdBy || user?.id || 'unknown',
        createdAt: clientData.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lastModifiedBy: user?.id || 'unknown',
      };

      if (clientSidebarData?.isEdit && clientData.id) {
        // Update existing client
        const clientRef = doc(db, 'clients', clientData.id);
        await updateDoc(clientRef, {
          ...dataToSave,
          lastActivity: new Date().toISOString(),
        });
        console.log('[TasksPageModals] Client updated successfully');
      } else {
        // Create new client
        const clientsRef = collection(db, 'clients');
        await addDoc(clientsRef, dataToSave);
        console.log('[TasksPageModals] Client created successfully');
      }

      handleClientSidebarClose();
      success('Cliente guardado exitosamente');
    } catch (err) {
      console.error('[TasksPageModals] Error saving client:', err);
      error('Error al guardar el cliente');
    } finally {
      const { setIsClientLoading } = useTasksPageStore.getState();
      setIsClientLoading(false);
    }
  };


  // Handle delete popup with new modal system
  useEffect(() => {
    if (isDeletePopupOpen && deleteTarget) {
      openModal({
        type: 'confirm',
        variant: 'danger',
        title: `Eliminar ${deleteTarget.type === 'task' ? 'Tarea' : 'Cuenta'}`,
        description: `¿Estás seguro de que quieres eliminar esta ${deleteTarget.type === 'task' ? 'tarea' : 'cuenta'}?`,
        requiresConfirmation: true,
        confirmationKeyword: 'eliminar',
        confirmText: 'Confirmar Eliminación',
        onConfirm: async () => {
          console.log('[TasksPageModals] Delete popup confirmed for:', deleteTarget);
          if (deleteTarget.type === 'task') {
            // ✅ OPTIMISTIC UPDATE: Eliminar inmediatamente del estado local
            const { deleteTaskOptimistic, addTask } = useDataStore.getState();
            const deletedTask = deleteTaskOptimistic(deleteTarget.id);
            
            if (!deletedTask) {
              error('Tarea no encontrada');
              return;
            }
            
            try {
              console.log('[TasksPageModals] Task removed from local state:', deleteTarget.id);
              
              // Ahora eliminar de Firestore
              console.log('[TasksPageModals] Deleting task from Firestore:', deleteTarget.id);
              await deleteDoc(doc(db, 'tasks', deleteTarget.id));
              console.log('[TasksPageModals] Task deleted successfully from Firestore');
              
              const { closeDeletePopup } = useTasksPageStore.getState();
              closeDeletePopup();
              success('Tarea eliminada exitosamente');
            } catch (error) {
              console.error('[TasksPageModals] Error deleting task:', error);
              
              // ✅ ROLLBACK: Si falla, restaurar la tarea en el estado local
              addTask(deletedTask);
              console.log('[TasksPageModals] Task restored to local state after error');
              
              error('Error al eliminar la tarea');
            }
          }
        },
        onCancel: () => {
          console.log('[TasksPageModals] Delete popup cancelled');
          const { closeDeletePopup } = useTasksPageStore.getState();
          closeDeletePopup();
        },
      });
    }
  }, [isDeletePopupOpen, deleteTarget, openModal]);

  // Handle confirm exit popup with new modal system
  useEffect(() => {
    if (isConfirmExitOpen) {
      openModal({
        type: 'confirm',
        variant: 'warning',
        title: '¿Salir sin guardar?',
        description: '¿Estás seguro de que quieres salir sin guardar los cambios? Perderás todo el progreso no guardado.',
        confirmText: 'Salir',
        cancelText: 'Cancelar',
        onConfirm: handleConfirmExit,
        onCancel: handleCancelExit,
      });
    }
  }, [isConfirmExitOpen, openModal]);

  // Handle delete client popup with new modal system
  useEffect(() => {
    if (isDeleteClientOpen && typeof isDeleteClientOpen === 'string') {
      openModal({
        type: 'confirm',
        variant: 'danger',
        title: 'Eliminar Cliente',
        description: '¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer.',
        requiresConfirmation: true,
        confirmationKeyword: 'eliminar',
        confirmText: 'Confirmar Eliminación',
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'clients', isDeleteClientOpen));
            const { setIsDeleteClientOpen, setDeleteConfirm } = useTasksPageStore.getState();
            setIsDeleteClientOpen(false);
            setDeleteConfirm('');
            success('Cliente eliminado exitosamente');
          } catch (err) {
            console.error('Error deleting client:', err);
            error('Error al eliminar la cuenta');
          }
        },
        onCancel: () => {
          const { setIsDeleteClientOpen, setDeleteConfirm } = useTasksPageStore.getState();
          setIsDeleteClientOpen(false);
          setDeleteConfirm('');
        },
      });
    }
  }, [isDeleteClientOpen, openModal]);

  return (
    <>
      {/* Alert Components - Migrated to Sonner */}
      {/* Delete Popup - Migrated to new modal system */}
      {/* Client Delete Popup - Migrated to new modal system */}
      {/* Confirm Exit Popup - Migrated to new modal system */}

      {/* AccountDetailsCard - Nuevo modal unificado */}
      {isClientSidebarOpen && clientSidebarData && (
        <AccountDetailsCard
          isOpen={isClientSidebarOpen}
          onClose={handleClientSidebarClose}
          client={
            clientSidebarData.isEdit && clientSidebarData.client
              ? {
                  id: clientSidebarData.client.id,
                  name: clientSidebarData.client.name,
                  imageUrl: clientSidebarData.client.imageUrl,
                  projects: clientSidebarData.client.projects || [],
                  email: (clientSidebarData.client as any).email || '',
                  phone: (clientSidebarData.client as any).phone || '',
                  address: (clientSidebarData.client as any).address || '',
                  industry: (clientSidebarData.client as any).industry || '',
                  website: (clientSidebarData.client as any).website || '',
                  taxId: (clientSidebarData.client as any).taxId || '',
                  notes: (clientSidebarData.client as any).notes || '',
                  isActive: (clientSidebarData.client as any).isActive ?? true,
                  createdAt: clientSidebarData.client.createdAt,
                  createdBy: clientSidebarData.client.createdBy,
                }
              : undefined
          }
          mode={clientSidebarData.isEdit ? 'edit' : 'create'}
          onSave={handleClientSubmit}
        />
      )}

      {/* Session Revoke Popup - ELIMINADO - Ahora va directo al modal de Clerk */}
    </>
  );
} 