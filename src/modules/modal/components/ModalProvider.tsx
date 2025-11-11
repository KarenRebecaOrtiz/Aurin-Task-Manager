'use client';

import React from 'react';
import { useModalStore } from '../stores/modalStore';
import { Modal } from './Modal';
import { ConfirmModal } from './variants/ConfirmModal';
import { LoaderModal } from './variants/LoaderModal';
import { AlertModal } from './variants/AlertModal';

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const modals = useModalStore((state) => state.modals);
  const closeModal = useModalStore((state) => state.closeModal);

  const renderModalContent = (modal: typeof modals[0]) => {
    switch (modal.type) {
      case 'confirm':
        return <ConfirmModal config={modal} onClose={() => closeModal(modal.id)} />;
      case 'loader':
        return <LoaderModal config={modal} onClose={() => closeModal(modal.id)} />;
      case 'alert':
        return <AlertModal config={modal} onClose={() => closeModal(modal.id)} />;
      case 'custom':
        return (
          <Modal config={modal} onClose={() => closeModal(modal.id)}>
            {modal.content}
          </Modal>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {children}
      {modals.map((modal) => (
        <React.Fragment key={modal.id}>{renderModalContent(modal)}</React.Fragment>
      ))}
    </>
  );
};
