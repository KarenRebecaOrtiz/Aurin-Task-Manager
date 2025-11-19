import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ContainerType } from '../types';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { shouldShowConfirmation } from '../utils';

export const useHeaderNavigation = (
  onChangeContainer: ((container: ContainerType) => void) | undefined,
  isCreateTaskOpen: boolean,
  isEditTaskOpen: boolean,
  hasUnsavedChanges: boolean
) => {
  const router = useRouter();

  const handleContainerChange = useCallback(
    (newContainer: ContainerType) => {
      const isModalOpen = isCreateTaskOpen || isEditTaskOpen;

      if (shouldShowConfirmation(isModalOpen, hasUnsavedChanges)) {
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        // Use router.push if no callback provided
        if (onChangeContainer) {
          onChangeContainer(newContainer);
        } else {
          switch (newContainer) {
            case 'tareas':
              router.push('/dashboard/tasks');
              break;
            case 'kanban':
              router.push('/dashboard/kanban');
              break;
            case 'archive':
              router.push('/dashboard/archive');
              break;
            case 'files':
              router.push('/dashboard/files');
              break;
            case 'settings':
              router.push('/dashboard/settings');
              break;
            case 'config':
              router.push('/dashboard/settings');
              break;
            case 'cuentas':
              router.push('/dashboard/accounts');
              break;
            case 'miembros':
              router.push('/dashboard/members');
              break;
          }
        }
      }
    },
    [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer, router]
  );

  return { handleContainerChange };
};
