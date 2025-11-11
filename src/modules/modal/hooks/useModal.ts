import { useCallback } from 'react';
import { useModalStore, ModalConfig } from '../stores/modalStore';

export const useModal = () => {
  const { openModal: openModalStore, closeModal: closeModalStore, closeAllModals, updateModal } = useModalStore();

  const openModal = useCallback(
    (config: Omit<ModalConfig, 'id'>) => {
      return openModalStore(config);
    },
    [openModalStore]
  );

  const closeModal = useCallback(
    (id: string) => {
      closeModalStore(id);
    },
    [closeModalStore]
  );

  const closeAll = useCallback(() => {
    closeAllModals();
  }, [closeAllModals]);

  const update = useCallback(
    (id: string, updates: Partial<ModalConfig>) => {
      updateModal(id, updates);
    },
    [updateModal]
  );

  return {
    openModal,
    closeModal,
    closeAll,
    updateModal: update,
  };
};
