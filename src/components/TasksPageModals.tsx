import React from 'react';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useShallow } from 'zustand/react/shallow';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import EditTask from './EditTask';
import CreateTask from './CreateTask';
import ArchiveTable from './ArchiveTable';
import DeletePopup from './DeletePopup';
import ClientOverlay from './ClientOverlay';
import SuccessAlert from './SuccessAlert';
import FailAlert from './FailAlert';
import clientStyles from './ClientsTable.module.scss';

export default function TasksPageModals() {
  console.log('[TasksPageModals] Render');
  
  // Get modal states
  const isEditTaskOpen = useTasksPageStore(useShallow(state => state.isEditTaskOpen));
  const isCreateTaskOpen = useTasksPageStore(useShallow(state => state.isCreateTaskOpen));
  const isArchiveTableOpen = useTasksPageStore(useShallow(state => state.isArchiveTableOpen));
  const editTaskId = useTasksPageStore(useShallow(state => state.editTaskId));
  const deleteTarget = useTasksPageStore(useShallow(state => state.deleteTarget));
  const isDeletePopupOpen = useTasksPageStore(useShallow(state => state.isDeletePopupOpen));
  const isDeleteClientOpen = useTasksPageStore(useShallow(state => state.isDeleteClientOpen));
  const isConfirmExitOpen = useTasksPageStore(useShallow(state => state.isConfirmExitOpen));
  const isClientSidebarOpen = useTasksPageStore(useShallow(state => state.isClientSidebarOpen));
  const clientSidebarData = useTasksPageStore(useShallow(state => state.clientSidebarData));
  const isClientLoading = useTasksPageStore(useShallow(state => state.isClientLoading));
  const hasUnsavedChanges = useTasksPageStore(useShallow(state => state.hasUnsavedChanges));
  const deleteConfirm = useTasksPageStore(useShallow(state => state.deleteConfirm));
  const showSuccessAlert = useTasksPageStore(useShallow(state => state.showSuccessAlert));
  const showFailAlert = useTasksPageStore(useShallow(state => state.showFailAlert));
  const successMessage = useTasksPageStore(useShallow(state => state.successMessage));
  const failMessage = useTasksPageStore(useShallow(state => state.failMessage));



  // Action handlers
  const handleConfirmExit = () => {
    console.log('[TasksPageModals] handleConfirmExit called');
    const { setIsConfirmExitOpen, closeCreateTask, setHasUnsavedChanges } = useTasksPageStore.getState();
    setIsConfirmExitOpen(false);
    closeCreateTask();
    setHasUnsavedChanges(false);
  };

  const handleCancelExit = () => {
    console.log('[TasksPageModals] handleCancelExit called');
    const { setIsConfirmExitOpen } = useTasksPageStore.getState();
    setIsConfirmExitOpen(false);
  };

  const handleClientSidebarClose = () => {
    console.log('[TasksPageModals] handleClientSidebarClose called');
    const { setIsClientSidebarOpen, setClientSidebarData } = useTasksPageStore.getState();
    setIsClientSidebarOpen(false);
    setClientSidebarData(null);
  };

  const handleClientSubmit = async (form: { id?: string; name: string; imageFile: File; imagePreview: string; projects: string[] }) => {
    console.log('[TasksPageModals] handleClientSubmit called', form);
    // Client submit logic would go here
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

  return (
    <>
      {/* EditTask Modal */}
      {isEditTaskOpen && editTaskId && (
        <EditTask
          isOpen={isEditTaskOpen}
          onToggle={() => {
            const { closeEditTask } = useTasksPageStore.getState();
            closeEditTask();
          }}
          taskId={editTaskId}
          onHasUnsavedChanges={(hasChanges) => {
            const { setHasUnsavedChanges } = useTasksPageStore.getState();
            setHasUnsavedChanges(hasChanges);
          }}
          onCreateClientOpen={() => {
            const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
            setClientSidebarData({ isEdit: false });
            setIsClientSidebarOpen(true);
          }}
          onEditClientOpen={(client) => {
            const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
            setClientSidebarData({
              client: {
                ...client,
                projectCount: client.projects?.length || 0,
                createdAt: 'createdAt' in client ? (client as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
              },
              isEdit: true,
            });
            setIsClientSidebarOpen(true);
          }}
          onClientAlertChange={(alert) => {
            if (alert && alert.type === 'success') {
              handleShowSuccessAlert(alert.message || '');
            } else if (alert && alert.type === 'fail') {
              handleShowFailAlert(alert.error || alert.message || '');
            }
          }}
          onShowSuccessAlert={handleShowSuccessAlert}
          onShowFailAlert={handleShowFailAlert}
        />
      )}

      {/* CreateTask Modal */}
      {isCreateTaskOpen && (
        <CreateTask
          isOpen={isCreateTaskOpen}
          onToggle={() => {
            if (hasUnsavedChanges) {
              if (window.confirm('Hay cambios sin guardar. ¿Deseas continuar?')) {
                const { closeCreateTask, setHasUnsavedChanges } = useTasksPageStore.getState();
                closeCreateTask();
                setHasUnsavedChanges(false);
              }
            } else {
              const { closeCreateTask } = useTasksPageStore.getState();
              closeCreateTask();
            }
          }}
          onHasUnsavedChanges={(hasChanges) => {
            const { setHasUnsavedChanges } = useTasksPageStore.getState();
            setHasUnsavedChanges(hasChanges);
          }}
          onCreateClientOpen={() => {
            const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
            setClientSidebarData({ isEdit: false });
            setIsClientSidebarOpen(true);
          }}
          onEditClientOpen={(client) => {
            const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
            setClientSidebarData({
              client: {
                ...client,
                projectCount: client.projects?.length || 0,
                createdAt: 'createdAt' in client ? (client as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
              },
              isEdit: true,
            });
            setIsClientSidebarOpen(true);
          }}
          onTaskCreated={() => {
            const { closeCreateTask } = useTasksPageStore.getState();
            closeCreateTask();
          }}
          onShowSuccessAlert={handleShowSuccessAlert}
          onShowFailAlert={handleShowFailAlert}
        />
      )}

      {/* ArchiveTable */}
      {isArchiveTableOpen && (
        <ArchiveTable
          onEditTaskOpen={(taskId) => {
            const { openEditTask } = useTasksPageStore.getState();
            openEditTask(taskId);
          }}
          onViewChange={(view: 'table' | 'kanban') => {
            const { setTaskView, closeArchiveTable } = useTasksPageStore.getState();
            setTaskView(view);
            closeArchiveTable();
          }}
          onDeleteTaskOpen={(taskId) => {
            const { openDeletePopup } = useTasksPageStore.getState();
            openDeletePopup('task', taskId);
          }}
          onClose={() => {
            const { closeArchiveTable } = useTasksPageStore.getState();
            closeArchiveTable();
          }}
          onTaskArchive={async () => {
            // Task archive logic would go here
            return true;
          }}
          onDataRefresh={() => {
            // Data refresh logic would go here
          }}
        />
      )}

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

      {/* Delete Popup */}
      {isDeletePopupOpen && deleteTarget && (
        <DeletePopup
          isOpen={isDeletePopupOpen}
          title={`Eliminar ${deleteTarget.type === 'task' ? 'Tarea' : 'Cuenta'}`}
          description={`¿Estás seguro de que quieres eliminar esta ${deleteTarget.type === 'task' ? 'tarea' : 'cuenta'}?`}
          onConfirm={async () => {
            if (deleteTarget.type === 'task') {
              try {
                await deleteDoc(doc(db, 'tasks', deleteTarget.id));
                const { closeDeletePopup } = useTasksPageStore.getState();
                closeDeletePopup();
                handleShowSuccessAlert('Tarea eliminada exitosamente');
              } catch (error) {
                console.error('Error deleting task:', error);
                handleShowFailAlert('Error al eliminar la tarea');
              }
            }
          }}
          onCancel={() => {
            const { closeDeletePopup } = useTasksPageStore.getState();
            closeDeletePopup();
          }}
        />
      )}

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

      {/* Confirm Exit Popup */}
      {isConfirmExitOpen && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup}>
            <h2>¿Salir sin guardar?</h2>
            <p>¿Estás seguro de que quieres salir sin guardar los cambios? Perderás todo el progreso no guardado.</p>
            <div className={clientStyles.popupActions}>
              <button
                onClick={handleConfirmExit}
                className={clientStyles.deleteConfirmButton}
              >
                Salir
              </button>
              <button
                onClick={handleCancelExit}
                className={clientStyles.cancelButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 