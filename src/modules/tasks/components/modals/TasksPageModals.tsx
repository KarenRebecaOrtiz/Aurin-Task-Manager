import React, { useEffect } from 'react';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useShallow } from 'zustand/react/shallow';
import { doc, deleteDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@clerk/nextjs';
import { useDataStore } from '@/stores/dataStore';
import { useModal } from '@/modules/modal';
import ClientOverlay from '@/components/ClientOverlay';
import SuccessAlert from '@/components/SuccessAlert';
import FailAlert from '@/components/FailAlert';
import clientStyles from '@/components/ClientsTable.module.scss';

export default function TasksPageModals() {
  const { user } = useUser();
  const { openModal, closeModal } = useModal();
  
  // Optimized selectors to prevent unnecessary re-renders
  const deleteTarget = useTasksPageStore(useShallow(state => state.deleteTarget));
  const isDeletePopupOpen = useTasksPageStore(useShallow(state => state.isDeletePopupOpen));
  const isDeleteClientOpen = useTasksPageStore(useShallow(state => state.isDeleteClientOpen));
  const isConfirmExitOpen = useTasksPageStore(useShallow(state => state.isConfirmExitOpen));
  const isClientSidebarOpen = useTasksPageStore(useShallow(state => state.isClientSidebarOpen));
  const clientSidebarData = useTasksPageStore(useShallow(state => state.clientSidebarData));
  const isClientLoading = useTasksPageStore(useShallow(state => state.isClientLoading));
  const deleteConfirm = useTasksPageStore(useShallow(state => state.deleteConfirm));
  const showSuccessAlert = useTasksPageStore(useShallow(state => state.showSuccessAlert));
  const showFailAlert = useTasksPageStore(useShallow(state => state.showFailAlert));
  const successMessage = useTasksPageStore(useShallow(state => state.successMessage));
  const failMessage = useTasksPageStore(useShallow(state => state.failMessage));
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

  const handleClientSubmit = async (form: { id?: string; name: string; imageFile: File | null; imagePreview: string; projects: string[] }) => {
    console.log('[TasksPageModals] handleClientSubmit called', form);
    
    try {
      const { setIsClientLoading } = useTasksPageStore.getState();
      setIsClientLoading(true);
      
      const clientData = {
        name: form.name,
        imageUrl: form.imagePreview,
        projectCount: form.projects.length,
        projects: form.projects,
        createdBy: user?.id || 'unknown',
        createdAt: new Date().toISOString(),
      };

      if (clientSidebarData?.isEdit && form.id) {
        // Update existing client
        const clientRef = doc(db, 'clients', form.id);
        await updateDoc(clientRef, {
          ...clientData,
          lastActivity: new Date().toISOString(),
        });
        console.log('[TasksPageModals] Client updated successfully');
      } else {
        // Create new client
        const clientsRef = collection(db, 'clients');
        await addDoc(clientsRef, clientData);
        console.log('[TasksPageModals] Client created successfully');
      }

      handleClientSidebarClose();
      handleShowSuccessAlert('Cliente guardado exitosamente');
    } catch (error) {
      console.error('[TasksPageModals] Error saving client:', error);
      handleShowFailAlert('Error al guardar el cliente');
    } finally {
      const { setIsClientLoading } = useTasksPageStore.getState();
      setIsClientLoading(false);
    }
  };

  const handleShowSuccessAlert = (message: string) => {
    console.log('[TasksPageModals] handleShowSuccessAlert called', message);
    const { showSuccess } = useTasksPageStore.getState();
    showSuccess(message);
  };

  const handleShowFailAlert = (message: string) => {
    console.log('[TasksPageModals] handleShowFailAlert called', message);
    const { showFail } = useTasksPageStore.getState();
    showFail(message);
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
              handleShowFailAlert('Tarea no encontrada');
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
              handleShowSuccessAlert('Tarea eliminada exitosamente');
            } catch (error) {
              console.error('[TasksPageModals] Error deleting task:', error);
              
              // ✅ ROLLBACK: Si falla, restaurar la tarea en el estado local
              addTask(deletedTask);
              console.log('[TasksPageModals] Task restored to local state after error');
              
              handleShowFailAlert('Error al eliminar la tarea');
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

  return (
    <>
      {/* Alert Components */}
      {showSuccessAlert && (
        <SuccessAlert
          message={successMessage}
          onClose={() => {
            const { setShowSuccessAlert } = useTasksPageStore.getState();
            setShowSuccessAlert(false);
          }}
        />
      )}
      {showFailAlert && (
        <FailAlert
          message={failMessage}
          error="Se produjo un error al realizar la operación"
          onClose={() => {
            const { setShowFailAlert } = useTasksPageStore.getState();
            setShowFailAlert(false);
          }}
        />
      )}

      {/* Delete Popup - Migrated to new modal system */}

      {/* Client Delete Popup */}
      {isDeleteClientOpen && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup}>
            <h2>Confirmar Eliminación</h2>
            <p>Escribe &apos;Eliminar&apos; para confirmar:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => {
                const { setDeleteConfirm } = useTasksPageStore.getState();
                setDeleteConfirm(e.target.value);
              }}
              className={clientStyles.deleteConfirmInput}
              placeholder="Escribe 'Eliminar'"
            />
            <button
              onClick={async () => {
                if (deleteConfirm.toLowerCase() === 'eliminar' && typeof isDeleteClientOpen === 'string') {
                  try {
                    await deleteDoc(doc(db, 'clients', isDeleteClientOpen));
                    const { setIsDeleteClientOpen, setDeleteConfirm } = useTasksPageStore.getState();
                    setIsDeleteClientOpen(false);
                    setDeleteConfirm('');
                    handleShowSuccessAlert('Cliente eliminado exitosamente');
                  } catch (error) {
                    console.error('Error deleting client:', error);
                    handleShowFailAlert('Error al eliminar la cuenta');
                  }
                }
              }}
              disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
              className={clientStyles.deleteConfirmButton}
            >
              Sí, eliminar
            </button>
            <button
              onClick={() => {
                const { setIsDeleteClientOpen, setDeleteConfirm } = useTasksPageStore.getState();
                setIsDeleteClientOpen(false);
                setDeleteConfirm('');
              }}
              className={clientStyles.cancelButton}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirm Exit Popup - Migrated to new modal system */}

      {/* ClientSidebar */}
      {isClientSidebarOpen && clientSidebarData && (
        <ClientOverlay
          isOpen={isClientSidebarOpen}
          isEdit={clientSidebarData.isEdit}
          initialForm={
            clientSidebarData.isEdit && clientSidebarData.client
              ? {
                  id: clientSidebarData.client.id,
                  name: clientSidebarData.client.name,
                  imageFile: null,
                  imagePreview: clientSidebarData.client.imageUrl,
                  projects: clientSidebarData.client.projects.length
                    ? clientSidebarData.client.projects
                    : [''],
                  deleteProjectIndex: null,
                  deleteConfirm: '',
                }
              : {
                  name: '',
                  imageFile: null,
                  imagePreview: '',
                  projects: [''],
                  deleteProjectIndex: null,
                  deleteConfirm: '',
                }
          }
          onFormSubmit={handleClientSubmit}
          onClose={handleClientSidebarClose}
          isClientLoading={isClientLoading}
        />
      )}

      {/* Session Revoke Popup - ELIMINADO - Ahora va directo al modal de Clerk */}
    </>
  );
} 