'use client';

import { ReactNode, useCallback } from 'react';
import { useDialogs, useDialogStore } from '../stores/dialogStore';
import { ConfirmDialog } from './variants/ConfirmDialog';
import { AlertDialog } from './variants/AlertDialog';
import { FormDialog } from './variants/FormDialog';
import { Dialog } from './Dialog';
import { DialogConfig } from '../types/dialog.types';

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const dialogs = useDialogs();
  const close = useDialogStore((state) => state.close);

  const renderDialog = useCallback(
    (config: DialogConfig) => {
      const handleClose = () => close(config.id);

      switch (config.type) {
        case 'confirm':
          return (
            <ConfirmDialog
              key={config.id}
              config={config}
              onClose={handleClose}
            />
          );
        case 'alert':
          return (
            <AlertDialog
              key={config.id}
              config={config}
              onClose={handleClose}
            />
          );
        case 'form':
          return (
            <FormDialog
              key={config.id}
              config={config}
              onClose={handleClose}
            />
          );
        case 'custom':
        default:
          return (
            <Dialog
              key={config.id}
              open={true}
              onClose={handleClose}
              title={config.title}
              description={config.description}
              size={config.size}
              variant={config.variant}
              closeOnOverlayClick={config.closeOnOverlayClick}
              closeOnEscape={config.closeOnEscape}
              showCloseButton={config.showCloseButton}
            >
              {config.content}
            </Dialog>
          );
      }
    },
    [close]
  );

  return (
    <>
      {children}
      {dialogs.map(renderDialog)}
    </>
  );
}
