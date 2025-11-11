import { useCallback } from 'react';
import { ContainerType } from '../types';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { shouldShowConfirmation } from '../utils';

export const useHeaderNavigation = (
  onChangeContainer: (container: ContainerType) => void,
  isCreateTaskOpen: boolean,
  isEditTaskOpen: boolean,
  hasUnsavedChanges: boolean
) => {
  const handleContainerChange = useCallback(
    (newContainer: ContainerType) => {
      const isModalOpen = isCreateTaskOpen || isEditTaskOpen;
      
      if (shouldShowConfirmation(isModalOpen, hasUnsavedChanges)) {
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        onChangeContainer(newContainer);
      }
    },
    [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer]
  );

  return { handleContainerChange };
};
